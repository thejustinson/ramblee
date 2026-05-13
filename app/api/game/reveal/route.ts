import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createFeedEvent } from '@/utils/feed-events';

export async function POST(req: NextRequest) {
  try {
    const { gameId } = await req.json();

    if (!gameId) {
      return NextResponse.json({ error: "Missing gameId" }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Verify organiser
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("*")
      .eq("id", gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    if (game.organiser_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (game.is_revealing) {
      return NextResponse.json({ error: "Already revealing" }, { status: 400 });
    }

    // 2. Fetch current question and its correct answer
    const { data: questions, error: qError } = await supabase
      .from("questions")
      .select("id, correct_answer, order_index")
      .eq("game_id", gameId)
      .order("order_index", { ascending: true });

    if (qError || !questions) {
      return NextResponse.json({ error: "Questions not found" }, { status: 404 });
    }

    const currentIdx = game.current_question_index;
    const currentQuestion = questions[currentIdx];

    if (!currentQuestion) {
      return NextResponse.json({ error: "Current question not found" }, { status: 404 });
    }

    // 3. PHASE 1: REVEAL
    // Update game to revealing state
    const { error: revealError } = await supabase
      .from("games")
      .update({
        is_revealing: true,
        reveal_answer: currentQuestion.correct_answer
      })
      .eq("id", gameId);

    if (revealError) {
      console.error("Reveal update error:", revealError);
      return NextResponse.json({ error: "Failed to reveal answer" }, { status: 500 });
    }

    // 4. WAIT 2 SECONDS
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 5. PHASE 2: ADVANCE
    const nextIdx = currentIdx + 1;
    const isFinished = nextIdx >= questions.length;

    const updateData: {
      is_revealing: boolean;
      reveal_answer: string | null;
      status?: string;
      current_question_index?: number;
      question_started_at?: string;
    } = {
      is_revealing: false,
      reveal_answer: null,
    };

    if (isFinished) {
      updateData.status = "finished";
    } else {
      updateData.current_question_index = nextIdx;
      updateData.question_started_at = new Date().toISOString();
    }

    const { error: advanceError } = await supabase
      .from("games")
      .update(updateData)
      .eq("id", gameId);

    if (advanceError) {
      console.error("Advance update error:", advanceError);
      return NextResponse.json({ error: "Failed to advance game" }, { status: 500 });
    }

    // 6. IF FINISHED, COMPUTE LEADERBOARD, REWARD CLAIMS, AND NOTIFY FOLLOWERS
    if (isFinished) {
      // a. Aggregate scores
      const { data: answers } = await supabase
        .from("answers")
        .select("participant_id, points_earned")
        .eq("game_id", gameId);

      if (answers && answers.length > 0) {
        const scores: Record<string, number> = {};
        answers.forEach(a => {
          scores[a.participant_id] = (scores[a.participant_id] || 0) + a.points_earned;
        });

        // Rank all participants by score (descending)
        const ranked = Object.entries(scores)
          .sort(([, a], [, b]) => b - a)
          .map(([pid], idx) => ({ pid, position: idx + 1 }));

        // Emit "played" feed event for authenticated participants.
        // (Guests have no user_id so we skip them.)
        try {
          const { data: participantsWithUsers } = await supabase
            .from('participants')
            .select('id, user_id')
            .eq('game_id', gameId)
            .not('user_id', 'is', null);

          if (participantsWithUsers && participantsWithUsers.length > 0) {
            await Promise.all(
              participantsWithUsers
                .filter((p) => p.user_id)
                .map((p) =>
                  createFeedEvent(
                    supabase,
                    p.user_id as string,
                    'game_played',
                    {
                      game_id: gameId,
                      title: game.title,
                    },
                    `played-${gameId}-${p.id}`
                  )
                )
            );
          }
        } catch (e) {
          console.error('Failed to create game_played feed events:', e);
        }

        // b. Look up game reward config
        const rewardDistribution: { position: number; percentage: number }[] | null =
          game.reward_distribution ?? null;
        const rewardAmount: number | null = game.reward_amount ?? null;
        const rewardToken: string | null = game.reward_token ?? null;

        // c. Insert reward_claims for each rewarded position
        if (rewardDistribution && rewardAmount && rewardToken) {
          // Clean up any existing unclaimed rewards for this game (prevents duplicates on re-reveal)
          await supabase.from("reward_claims").delete().eq("game_id", gameId).eq("status", "unclaimed");

          const claimInserts: Array<{
            game_id: string;
            participant_id: string | null;
            user_id: string | null;
            position: number;
            amount: number;
            token: string;
            status: string;
          }> = [];
          const pendingEvents: Array<{
            user_id: string;
            event_type: 'reward_pending';
            reference_id: string;
            metadata: Record<string, unknown>;
          }> = [];

          for (const split of rewardDistribution) {
            const winner = ranked.find(r => r.position === split.position);
            if (!winner) continue;

            const { data: participant } = await supabase
              .from("participants")
              .select("user_id, display_name")
              .eq("id", winner.pid)
              .single();

            let participantWallet = null;
            if (participant?.user_id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('wallet_address')
                .eq('id', participant.user_id)
                .single();
              participantWallet = profile?.wallet_address ?? null;
            }

            const payoutAmount = parseFloat(
              ((split.percentage / 100) * rewardAmount).toFixed(6)
            );

            const userId = participant?.user_id ?? null;
            claimInserts.push({
              game_id: gameId,
              participant_id: winner.pid,
              user_id: userId,
              position: split.position,
              amount: payoutAmount,
              token: rewardToken,
              status: "unclaimed",
            });

            if (userId && !participantWallet) {
              pendingEvents.push({
                user_id: userId,
                event_type: 'reward_pending',
                reference_id: `claim-${gameId}-${winner.pid}-${split.position}`,
                metadata: {
                  game_id: gameId,
                  title: game.title,
                  position: split.position,
                  amount: payoutAmount,
                  token: rewardToken,
                  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                },
              });
            }
          }

          if (claimInserts.length > 0) {
            await supabase.from("reward_claims").insert(claimInserts);
          }

          if (pendingEvents.length > 0) {
            for (const event of pendingEvents) {
              await createFeedEvent(supabase, event.user_id, event.event_type, event.metadata, event.reference_id);
            }
          }
        }

        // d. Notify followers of the overall winner (1st place)
        const overallWinner = ranked[0];
        if (overallWinner) {
          const { data: winnerParticipant } = await supabase
            .from("participants")
            .select("user_id, display_name")
            .eq("id", overallWinner.pid)
            .single();

          if (winnerParticipant?.user_id) {
            await createFeedEvent(
              supabase,
              winnerParticipant.user_id,
              'game_won',
              {
                game_id: gameId,
                title: game.title,
                position: 1,
              },
              `won-${gameId}`
            );

            const { data: followers } = await supabase
              .from("follows")
              .select("follower_id")
              .eq("following_id", winnerParticipant.user_id);

            if (followers && followers.length > 0) {
              const notifications = followers.map(f => ({
                user_id: f.follower_id,
                actor_id: winnerParticipant.user_id,
                type: "game_win",
                message: `${winnerParticipant.display_name} just won "${game.title}"! 🏆`,
                link: `/play/${gameId}/results`,
              }));

              await supabase.from("notifications").insert(notifications);
            }

            // Also notify the winner themselves
            if (winnerParticipant.user_id) {
              await supabase.from("notifications").insert({
                user_id: winnerParticipant.user_id,
                actor_id: winnerParticipant.user_id,
                type: "game_win",
                message: `You won "${game.title}"! Claim your reward. 🎉`,
                link: `/play/${gameId}/results`,
              });
            }

          } // end if followers
        } // end for winners
      } // end if isFinished
    } // end for questions

    return NextResponse.json({ success: true, finished: isFinished });
  } catch (err) {
    console.error("Reveal API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
