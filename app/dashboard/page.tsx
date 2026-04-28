import { createClient } from "@/utils/supabase/server";
import { Plus, History, Trophy } from "lucide-react";
import Link from "next/link";
import ShareButton from "./ShareButton";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  // Games the user organised
  const { data: games } = await supabase
    .from("games")
    .select("*")
    .eq("organiser_id", user!.id)
    .order("created_at", { ascending: false });

  // Games the user has participated in as a player
  const { data: participations } = await supabase
    .from("participants")
    .select("id, display_name, game_id, games(id, title, mode, status)")
    .eq("user_id", user!.id)
    .order("joined_at", { ascending: false });

  // Scores per participation
  const participantIds = (participations || []).map((p) => p.id);
  const { data: playerAnswers } = participantIds.length > 0
    ? await supabase.from("answers").select("participant_id, points_earned").in("participant_id", participantIds)
    : { data: [] };

  const scoreByParticipant: Record<string, number> = {};
  for (const a of playerAnswers || []) {
    scoreByParticipant[a.participant_id] = (scoreByParticipant[a.participant_id] || 0) + a.points_earned;
  }

  // Exclude games the user also organised, and deduplicate by game_id
  // (keep the participation with the highest score if duplicates exist)
  const organisedIds = new Set((games || []).map((g) => g.id));
  const seenGameIds = new Set<string>();
  const playedGames = (participations || [])
    .filter((p) => !organisedIds.has(p.game_id))
    .sort((a, b) => (scoreByParticipant[b.id] || 0) - (scoreByParticipant[a.id] || 0))
    .filter((p) => {
      if (seenGameIds.has(p.game_id)) return false;
      seenGameIds.add(p.game_id);
      return true;
    });

  return (
    <div className="flex flex-col gap-16">
      {/* Welcome */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 md:w-24 md:h-24 shrink-0 rounded-full overflow-hidden border-2 border-brand-border bg-brand-surface">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt={profile?.display_name || "User avatar"} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-display text-brand-muted uppercase">
                {profile?.display_name?.charAt(0) || user?.email?.charAt(0) || "?"}
              </div>
            )}
          </div>
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">
              Welcome back, {profile?.display_name?.split(" ")[0] || "Player"}
            </h1>
            <p className="text-brand-muted font-mono">@{profile?.handle}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <Link href="/join" className="px-6 py-4 border border-brand-border hover:border-brand-white text-brand-white font-semibold rounded-[2px] hover:bg-brand-surface transition-colors flex items-center gap-3">
            Join Game
          </Link>
          <Link href="/create" className="px-6 py-4 bg-brand-lime text-brand-black font-semibold rounded-[2px] hover:brightness-110 transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(200,255,0,0.15)]">
            <Plus className="w-5 h-5" />Create Game
          </Link>
        </div>
      </div>

      {/* Games Created */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-brand-border pb-4">
          <h2 className="font-display text-2xl font-bold flex items-center gap-3">
            <History className="w-6 h-6 text-brand-lime" />Games Created
          </h2>
        </div>
        {games && games.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {games.map((game) => (
              <Link key={game.id} href={`/dashboard/game/${game.id}`}
                className="bg-brand-surface border border-brand-border rounded-[2px] p-6 hover:border-brand-white transition-colors group flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-display font-bold text-xl group-hover:text-brand-lime transition-colors">{game.title}</h3>
                  <div className="text-xs font-mono uppercase tracking-widest text-brand-muted border border-brand-border px-2 py-1 rounded-[2px]">{game.status}</div>
                </div>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-brand-border/50">
                  <div className="font-mono text-sm text-brand-muted">{game.mode}</div>
                  <div className="flex items-center gap-4">
                    <ShareButton gameTitle={game.title} joinCode={game.join_code} questionCount={game.question_count} reward={game.reward} />
                    <div className="font-mono text-sm font-bold tracking-widest text-brand-white">{game.join_code}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center border border-dashed border-brand-border rounded-[2px] bg-brand-surface/30">
            <h3 className="font-display text-xl font-bold mb-2">No games created yet</h3>
            <p className="text-brand-muted mb-6 text-sm">Set up your first quiz room and let AI generate the questions.</p>
            <Link href="/create" className="px-6 py-3 bg-brand-lime text-brand-black font-semibold rounded-[2px] hover:brightness-110 transition-all">
              Create Your First Game
            </Link>
          </div>
        )}
      </div>

      {/* Games Played */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-brand-border pb-4">
          <h2 className="font-display text-2xl font-bold flex items-center gap-3">
            <Trophy className="w-6 h-6 text-brand-lime" />Games Played
          </h2>
        </div>
        {playedGames.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {playedGames.map((p) => {
              const game = p.games as any;
              const score = scoreByParticipant[p.id] || 0;
              return (
                <Link key={p.id} href={`/play/${p.game_id}/results`}
                  className="bg-brand-surface border border-brand-border rounded-[2px] p-6 hover:border-brand-white transition-colors group flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-display font-bold text-xl group-hover:text-brand-lime transition-colors">{game?.title}</h3>
                    <div className={`text-xs font-mono uppercase tracking-widest px-2 py-1 border rounded-[2px] ${game?.status === "finished" ? "border-brand-muted text-brand-muted" : "border-brand-lime text-brand-lime"}`}>
                      {game?.status}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-brand-border/50">
                    <div className="font-mono text-sm text-brand-muted">{p.display_name}</div>
                    <div className="font-display font-bold text-brand-lime text-lg">{score} pts</div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center border border-dashed border-brand-border rounded-[2px] bg-brand-surface/30">
            <h3 className="font-display text-xl font-bold mb-2">No games played yet</h3>
            <p className="text-brand-muted text-sm">Join a game using a room code to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
