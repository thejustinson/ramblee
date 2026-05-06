import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Trophy } from "lucide-react";
import BackButton from "@/app/components/BackButton";

export default async function GameSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: game, error } = await supabase
    .from("games")
    .select("id, title, mode, status, join_code, reward_amount, reward_token, organiser_id")
    .eq("id", id)
    .single();

  if (error || !game) notFound();

  // Verify the user is the organizer
  if (game.organiser_id !== user.id) {
    redirect(`/play/${id}/results`);
  }

  // Fetch all participants
  const { data: participants } = await supabase
    .from("participants")
    .select("id, user_id, display_name, joined_at")
    .eq("game_id", id)
    .order("joined_at", { ascending: true });

  // Fetch answers to compute points for each participant
  const { data: answers } = await supabase
    .from("answers")
    .select("participant_id, points_earned")
    .eq("game_id", id);

  const scoreMap: Record<string, { total_points: number; correct: number }> = {};
  for (const row of answers || []) {
    const pid = row.participant_id;
    if (!scoreMap[pid]) scoreMap[pid] = { total_points: 0, correct: 0 };
    scoreMap[pid].total_points += row.points_earned;
    if (row.points_earned > 0) scoreMap[pid].correct += 1;
  }

  // Fetch handles for linked accounts
  const userIds = participants?.map(p => p.user_id).filter(Boolean) as string[] || [];
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

  // Combine participant data with their scores
  const allPlayers = (participants || []).map(p => ({
    id: p.id,
    display_name: p.display_name,
    handle: p.user_id ? handleMap[p.user_id] : null,
    joined_at: p.joined_at,
    total_points: scoreMap[p.id]?.total_points || 0,
    correct: scoreMap[p.id]?.correct || 0,
  })).sort((a, b) => b.total_points - a.total_points);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="min-h-screen bg-brand-black text-brand-white flex flex-col p-6 md:p-12">
      <div className="max-w-4xl w-full mx-auto">
        <div className="mb-10">
          <BackButton />
        </div>

        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="font-mono text-brand-lime uppercase tracking-widest text-sm mb-2">Organizer Summary • {game.mode}</div>
            <h1 className="font-display text-4xl md:text-5xl font-bold">{game.title}</h1>
          </div>
          <div className={`text-xs font-mono uppercase tracking-widest px-3 py-2 border rounded-[2px] shrink-0 ${game.status === "finished" ? "border-brand-muted text-brand-muted" : "border-brand-lime text-brand-lime"}`}>
            {game.status}
          </div>
        </div>

        <div className="flex gap-4 mb-12 flex-wrap">
          <div className="bg-brand-surface border border-brand-border p-6 rounded-[2px] flex-1 min-w-[200px]">
            <Users className="w-6 h-6 text-brand-lime mb-3" />
            <div className="font-display text-3xl font-bold mb-1">{allPlayers.length}</div>
            <div className="font-mono text-xs uppercase tracking-widest text-brand-muted">Total Players</div>
          </div>
          <div className="bg-brand-surface border border-brand-border p-6 rounded-[2px] flex-1 min-w-[200px]">
            <Trophy className="w-6 h-6 text-brand-lime mb-3" />
            <div className="font-display text-3xl font-bold mb-1">
              {allPlayers.length > 0 ? allPlayers[0].display_name : "-"}
            </div>
            <div className="font-mono text-xs uppercase tracking-widest text-brand-muted">Winner</div>
          </div>
          {(game.reward_amount ?? 0) > 0 && (
            <div className="bg-brand-surface border border-brand-border p-6 rounded-[2px] flex-1 min-w-[200px]">
              <div className="w-6 h-6 text-brand-lime mb-3 font-bold">$</div>
              <div className="font-display text-3xl font-bold mb-1">
                {game.reward_amount} <span className="text-sm font-mono text-brand-muted">{game.reward_token}</span>
              </div>
              <div className="font-mono text-xs uppercase tracking-widest text-brand-muted">Total Prize Pool</div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mb-6 border-b border-brand-border pb-4">
          <Users className="w-6 h-6 text-brand-lime" />
          <h2 className="font-display text-2xl font-bold">Player Roster & Leaderboard</h2>
        </div>

        {allPlayers.length === 0 ? (
          <div className="text-center py-16 text-brand-muted border border-brand-border border-dashed rounded-[2px]">
            No one joined this game.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-brand-border">
                  <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-brand-muted font-medium w-16 text-center">Rank</th>
                  <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-brand-muted font-medium">Player</th>
                  <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-brand-muted font-medium">Joined At</th>
                  <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-brand-muted font-medium text-right">Correct</th>
                  <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-brand-muted font-medium text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {allPlayers.map((player, idx) => (
                  <tr key={player.id} className={`border-b border-brand-border/50 hover:bg-brand-black/50 transition-colors ${idx === 0 && player.total_points > 0 ? "bg-brand-lime/5" : ""}`}>
                    <td className="py-4 px-4 text-center font-bold">
                      {player.total_points > 0 && idx < 3 ? (
                        <span className="text-xl">{medals[idx]}</span>
                      ) : (
                        <span className="text-brand-muted font-mono">{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {player.handle ? (
                        <Link href={`/profile/${player.handle}`} className="font-bold text-brand-white hover:text-brand-lime transition-colors underline decoration-dashed underline-offset-4 flex items-center gap-2">
                          {player.display_name} <span className="text-xs font-mono text-brand-lime/70 no-underline bg-brand-lime/10 px-1.5 py-0.5 rounded-[2px]">Linked</span>
                        </Link>
                      ) : (
                        <span className="font-bold text-brand-white">{player.display_name}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm text-brand-muted">
                      {new Date(player.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-brand-muted">
                      {player.correct}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={`font-mono font-bold ${idx === 0 && player.total_points > 0 ? "text-brand-lime" : "text-brand-white"}`}>
                        {player.total_points}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
