import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

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

    const updateData: any = {
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

    // 6. IF FINISHED, COMPUTE WINNER AND NOTIFY FOLLOWERS
    if (isFinished) {
      // a. Compute Leaderboard
      const { data: answers } = await supabase
        .from("answers")
        .select("participant_id, points_earned")
        .eq("game_id", gameId);

      if (answers && answers.length > 0) {
        const scores: Record<string, number> = {};
        answers.forEach(a => {
          scores[a.participant_id] = (scores[a.participant_id] || 0) + a.points_earned;
        });

        // Find the participant with the max score
        let winnerPid = "";
        let maxScore = -1;
        for (const [pid, score] of Object.entries(scores)) {
          if (score > maxScore) {
            maxScore = score;
            winnerPid = pid;
          }
        }

        if (winnerPid) {
          // b. Get winner's user_id
          const { data: winnerParticipant } = await supabase
            .from("participants")
            .select("user_id, display_name")
            .eq("id", winnerPid)
            .single();

          if (winnerParticipant?.user_id) {
            // c. Get followers of the winner
            const { data: followers } = await supabase
              .from("follows")
              .select("follower_id")
              .eq("following_id", winnerParticipant.user_id);

            if (followers && followers.length > 0) {
              const { data: winnerProfile } = await supabase
                .from("profiles")
                .select("handle")
                .eq("id", winnerParticipant.user_id)
                .single();

              const notifications = followers.map(f => ({
                user_id: f.follower_id,
                actor_id: winnerParticipant.user_id,
                type: "game_win",
                message: `${winnerParticipant.display_name} just won a game: ${game.title}!`,
                link: `/profile/${winnerProfile?.handle || ''}`
              }));

              await supabase.from("notifications").insert(notifications);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, finished: isFinished });
  } catch (err) {
    console.error("Reveal API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
