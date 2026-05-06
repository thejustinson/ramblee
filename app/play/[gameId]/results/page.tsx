import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";
import BackButton from "@/app/components/BackButton";

export default async function GameResultsPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const supabase = await createClient();

  const { data: game, error } = await supabase
    .from("games")
    .select("id, title, mode, status, join_code, reward, reward_amount, reward_token, reward_distribution, organiser_id, profiles(handle, display_name)")
    .eq("id", gameId)
    .single();

  if (error || !game) notFound();
  
  const organizer = game.profiles as any;

  // Aggregate leaderboard
  const { data: answers } = await supabase
    .from("answers")
    .select("participant_id, points_earned, participants(user_id, display_name)")
    .eq("game_id", gameId);

  const scoreMap: Record<string, { display_name: string; total_points: number; correct: number; user_id?: string }> = {};
  for (const row of answers || []) {
    const pid = row.participant_id;
    const pData = row.participants as any;
    const name = pData?.display_name || "Unknown";
    const uId = pData?.user_id;

    if (!scoreMap[pid]) scoreMap[pid] = { display_name: name, total_points: 0, correct: 0, user_id: uId };
    scoreMap[pid].total_points += row.points_earned;
    if (row.points_earned > 0) scoreMap[pid].correct += 1;
  }

  // Fetch handles for the users
  const userIds = Object.values(scoreMap).map(v => v.user_id).filter(Boolean) as string[];
  let handleMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, handle")
      .in("id", userIds);
    if (profiles) {
      handleMap = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p.handle }), {});
    }
  }

  const leaderboard = Object.entries(scoreMap)
    .map(([pid, v]) => ({ 
      participant_id: pid, 
      ...v,
      handle: v.user_id ? handleMap[v.user_id] : null
    }))
    .sort((a, b) => b.total_points - a.total_points);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="min-h-screen bg-brand-black text-brand-white flex flex-col p-6 md:p-12">
      <div className="max-w-3xl w-full mx-auto">
        <div className="mb-10">
          <BackButton />
        </div>

        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="font-mono text-brand-lime uppercase tracking-widest text-sm mb-2">{game.mode}</div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">{game.title}</h1>
            {organizer && (
              <div className="text-sm font-mono text-brand-muted">
                Organized by{" "}
                {organizer.handle ? (
                  <Link href={`/profile/${organizer.handle}`} className="text-brand-white hover:text-brand-lime transition-colors underline decoration-dashed underline-offset-4">
                    @{organizer.handle}
                  </Link>
                ) : (
                  <span className="text-brand-white">{organizer.display_name || "Unknown"}</span>
                )}
              </div>
            )}
          </div>
          <div className={`text-xs font-mono uppercase tracking-widest px-3 py-2 border rounded-[2px] shrink-0 ${game.status === "finished" ? "border-brand-muted text-brand-muted" : "border-brand-lime text-brand-lime"}`}>
            {game.status}
          </div>
        </div>

        {(game.reward_amount || game.reward) && (
          <div className="mb-8 p-5 border border-brand-lime bg-brand-lime/5 rounded-[2px]">
            <p className="font-mono text-brand-lime text-xs uppercase tracking-widest mb-2">🏆 Prize Pool</p>
            {game.reward_amount ? (
              <>
                <p className="font-display text-2xl font-bold text-brand-white">
                  {game.reward_amount} <span className="text-brand-lime">{game.reward_token}</span>
                </p>
                {game.reward_distribution && (
                  <div className="mt-3 space-y-1">
                    {(game.reward_distribution as { position: number; percentage: number }[]).map((split) => {
                      const ordinal = split.position === 1 ? '1st' : split.position === 2 ? '2nd' : split.position === 3 ? '3rd' : `${split.position}th`;
                      const payout = ((split.percentage / 100) * game.reward_amount!).toFixed(2);
                      return (
                        <div key={split.position} className="flex items-center justify-between font-mono text-sm">
                          <span className="text-brand-muted">{ordinal} Place — {split.percentage}%</span>
                          <span className="text-brand-white font-semibold">{payout} {game.reward_token}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <p className="font-semibold text-brand-white">{game.reward}</p>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 mb-6 border-b border-brand-border pb-4">
          <Trophy className="w-6 h-6 text-brand-lime" />
          <h2 className="font-display text-2xl font-bold">Leaderboard</h2>
          <span className="font-mono text-brand-muted text-sm ml-auto">{leaderboard.length} players</span>
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-16 text-brand-muted">No answers recorded for this game yet.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {leaderboard.map((entry, idx) => (
              <div key={entry.participant_id}
                className={`flex items-center gap-5 p-5 rounded-[2px] border ${idx === 0 ? "border-brand-lime bg-brand-lime/10" : "border-brand-border bg-brand-surface"}`}>
                <div className={`font-display text-2xl font-bold w-10 text-center shrink-0 ${idx === 0 ? "text-brand-lime" : idx < 3 ? "text-brand-white" : "text-brand-muted"}`}>
                  {idx < 3 ? medals[idx] : `#${idx + 1}`}
                </div>
                <div className="flex-1 font-display text-xl font-bold">
                  {entry.handle ? (
                    <Link href={`/profile/${entry.handle}`} className="hover:text-brand-lime transition-colors underline decoration-dashed underline-offset-4">
                      {entry.display_name}
                    </Link>
                  ) : (
                    <span>{entry.display_name}</span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className={`font-display text-2xl font-bold ${idx === 0 ? "text-brand-lime" : "text-brand-white"}`}>{entry.total_points}</div>
                  <div className="font-mono text-xs text-brand-muted">{entry.correct} correct</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
