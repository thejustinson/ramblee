import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";

export interface PlayHistoryItem {
  id: string;
  title: string;
  date: string;
  position: string;
  score: number;
  accuracy: string;
  organiser_id: string;
}

export default function PlayHistoryBlock({ history, currentUserId }: { history: PlayHistoryItem[], currentUserId?: string }) {
  return (
    <div className="bg-brand-surface border border-brand-border rounded-[2px] p-4 md:p-8">
      <h2 className="font-display text-xl md:text-2xl font-bold mb-4 md:mb-6">Play History</h2>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-brand-border">
              <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-brand-muted font-medium">Game</th>
              <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-brand-muted font-medium">Date</th>
              <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-brand-muted font-medium">Position</th>
              <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-brand-muted font-medium text-right">Score</th>
              <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-brand-muted font-medium text-right">Accuracy</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {history.map((game, i) => {
              const isOrganizer = currentUserId && currentUserId === game.organiser_id;
              const targetUrl = isOrganizer ? `/dashboard/game/${game.id}` : `/play/${game.id}/results`;
              return (
                <tr key={i} className="border-b border-brand-border/50 hover:bg-brand-black/50 transition-colors group">
                  <td className="py-4 px-4 font-bold">{game.title}</td>
                  <td className="py-4 px-4 text-sm text-brand-muted">{game.date}</td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-[2px] text-xs font-bold ${game.position === "1st" ? "bg-brand-lime text-brand-black" : "bg-brand-surface border border-brand-border"}`}>
                      {game.position}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-brand-white">{game.score}</td>
                  <td className="py-4 px-4 text-right font-mono text-brand-muted">{game.accuracy}</td>
                  <td className="py-4 px-4 text-right">
                    <Link href={targetUrl} className="inline-flex p-1.5 text-brand-muted hover:text-brand-lime hover:bg-brand-lime/10 rounded-[2px] transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden flex flex-col divide-y divide-brand-border/50">
        {history.map((game, i) => {
          const isOrganizer = currentUserId && currentUserId === game.organiser_id;
          const targetUrl = isOrganizer ? `/dashboard/game/${game.id}` : `/play/${game.id}/results`;
          return (
            <Link key={i} href={targetUrl} className="flex items-center gap-4 py-4 hover:bg-brand-black/30 transition-colors -mx-4 px-4 active:opacity-70">
              <div className={`w-10 h-10 shrink-0 rounded-[2px] flex items-center justify-center text-xs font-bold ${game.position === "1st" ? "bg-brand-lime text-brand-black" : "bg-brand-card border border-brand-border text-brand-muted"}`}>
                {game.position}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{game.title}</div>
                <div className="text-[11px] text-brand-muted font-mono">{game.date}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display font-bold text-brand-lime text-sm">{game.score}</div>
                <div className="text-[11px] text-brand-muted font-mono">{game.accuracy}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-brand-border shrink-0" />
            </Link>
          );
        })}
      </div>

      {history.length === 0 && (
        <div className="py-12 text-center text-brand-muted text-sm">No games played yet.</div>
      )}
    </div>
  );
}
