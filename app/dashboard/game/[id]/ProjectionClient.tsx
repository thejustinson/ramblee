"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Trophy } from "lucide-react";

const OPTION_COLORS = ["bg-blue-600", "bg-orange-500", "bg-green-600", "bg-purple-600"];

interface LeaderboardEntry {
  participant_id: string;
  display_name: string;
  total_points: number;
}

export default function ProjectionClient({ initialGame, questions, initialLeaderboard }:
  { initialGame: any; questions: any[]; initialLeaderboard: LeaderboardEntry[] }) {
  const [game, setGame] = useState(initialGame);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(initialLeaderboard);
  const supabase = createClient();
  const currentQuestion = game.current_question_index >= 0 ? questions[game.current_question_index] : null;

  useEffect(() => {
    const ch = supabase.channel("proj_game")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${initialGame.id}` },
        (p: any) => setGame((prev: any) => ({ ...prev, ...p.new })))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [initialGame.id, supabase]);

  useEffect(() => {
    const ch = supabase.channel("proj_answers")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "answers", filter: `game_id=eq.${initialGame.id}` },
        async () => {
          const { data } = await supabase.from("answers")
            .select("participant_id, points_earned, participants(display_name)")
            .eq("game_id", initialGame.id);
          if (!data) return;
          const map: Record<string, LeaderboardEntry> = {};
          for (const row of data) {
            const pid = row.participant_id;
            const name = (row.participants as any)?.display_name || "Unknown";
            if (!map[pid]) map[pid] = { participant_id: pid, display_name: name, total_points: 0 };
            map[pid].total_points += row.points_earned;
          }
          setLeaderboard(Object.values(map).sort((a, b) => b.total_points - a.total_points));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [initialGame.id, supabase]);

  // Waiting (pre-launch)
  if (game.status !== "active" && game.status !== "finished") {
    return (
      <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center text-brand-white text-center p-8">
        <div className="font-mono text-brand-muted uppercase tracking-widest mb-10 text-lg">Get ready to play</div>
        <h1 className="font-display text-6xl md:text-8xl font-bold mb-6">{initialGame.title}</h1>
        <p className="text-brand-muted text-2xl mb-16">Join at <strong className="text-brand-white">ramblee.app/join</strong></p>
        <div className="bg-brand-surface border-2 border-brand-lime rounded-[2px] px-16 py-10 inline-block">
          <div className="font-mono text-brand-muted text-lg uppercase tracking-widest mb-4">Room Code</div>
          <div className="font-display font-bold text-8xl tracking-[0.3em] text-brand-lime">{initialGame.join_code}</div>
        </div>
      </div>
    );
  }

  // Waiting for first question
  if (game.status === "active" && (game.current_question_index === -1 || game.current_question_index === null)) {
    return (
      <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center text-brand-white text-center p-8">
        <div className="font-mono text-brand-lime uppercase tracking-widest text-2xl animate-pulse mb-6">Game is live!</div>
        <h1 className="font-display text-7xl font-bold mb-4">{initialGame.title}</h1>
        <p className="text-brand-muted text-2xl">First question coming up...</p>
      </div>
    );
  }

  // Final leaderboard
  if (game.status === "finished") {
    return (
      <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center text-brand-white p-8">
        <h1 className="font-display text-7xl font-bold text-brand-lime mb-12 text-center">Final Leaderboard</h1>
        <div className="w-full max-w-3xl flex flex-col gap-4">
          {leaderboard.slice(0, 10).map((entry, idx) => (
            <div key={entry.participant_id}
              className={`flex items-center gap-6 p-6 rounded-[2px] border ${idx === 0 ? "border-brand-lime bg-brand-lime/10" : "border-brand-border bg-brand-surface"}`}>
              <div className={`font-display text-4xl font-bold w-16 text-center ${idx === 0 ? "text-brand-lime" : idx === 1 ? "text-gray-300" : idx === 2 ? "text-amber-600" : "text-brand-muted"}`}>
                {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
              </div>
              <div className="flex-1 font-display text-4xl font-bold">{entry.display_name}</div>
              <div className="font-display text-4xl font-bold text-brand-lime">{entry.total_points}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── ACTIVE: Leaderboard hero layout ─────────────────────────────────────
  return (
    <div className="min-h-screen bg-brand-black flex text-brand-white overflow-hidden">
      {/* Left: Compact question panel (38%) */}
      <div className="w-[38%] shrink-0 flex flex-col p-8 border-r border-brand-border bg-brand-surface/20 justify-center">
        <div className="font-mono text-brand-lime uppercase tracking-widest text-sm mb-5">
          Question {game.current_question_index + 1} of {questions.length}
        </div>
        <h2 className="font-display text-2xl font-bold leading-snug mb-6">{currentQuestion?.text}</h2>
        <div className="grid grid-cols-1 gap-3">
          {currentQuestion?.options.map((opt: any, idx: number) => (
            <div key={opt.label} className={`${OPTION_COLORS[idx]} rounded-[2px] p-3 flex items-center gap-3`}>
              <div className="w-7 h-7 flex items-center justify-center bg-white/20 rounded-[2px] font-mono font-bold text-sm shrink-0">{opt.label}</div>
              <span className="font-medium text-white text-sm leading-tight">{opt.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Leaderboard HERO (62%) */}
      <div className="flex-1 flex flex-col p-10 overflow-hidden">
        <div className="flex items-center gap-4 mb-8">
          <Trophy className="w-9 h-9 text-brand-lime" />
          <h2 className="font-display text-4xl font-bold">Live Leaderboard</h2>
        </div>

        {leaderboard.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-brand-muted font-mono text-xl">Waiting for first answers...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 flex-1">
            {leaderboard.slice(0, 7).map((entry, idx) => (
              <div key={entry.participant_id}
                className={`flex items-center gap-5 p-5 rounded-[2px] border transition-all ${idx === 0 ? "border-brand-lime bg-brand-lime/10 shadow-[0_0_20px_rgba(200,255,0,0.1)]" : "border-brand-border bg-brand-surface"}`}>
                <div className={`font-display text-3xl font-bold w-12 text-center shrink-0 ${idx === 0 ? "text-brand-lime" : idx === 1 ? "text-gray-300" : idx === 2 ? "text-amber-500" : "text-brand-muted"}`}>
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                </div>
                <div className="flex-1 font-display text-2xl font-bold truncate">{entry.display_name}</div>
                <div className={`font-display text-2xl font-bold shrink-0 ${idx === 0 ? "text-brand-lime" : "text-brand-white"}`}>
                  {entry.total_points} <span className="text-sm font-mono font-normal text-brand-muted">pts</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
