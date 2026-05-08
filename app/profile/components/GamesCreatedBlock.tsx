import Link from "next/link";
import { ChevronRight, Users, History } from "lucide-react";

export interface CreatedGameItem {
  id: string;
  title: string;
  mode: string;
  date: string;
  participants: number;
}

export default function GamesCreatedBlock({ games, isOwnProfile = false }: { games: CreatedGameItem[], isOwnProfile?: boolean }) {
  if (!games || games.length === 0) return null;

  return (
    <div className="bg-brand-surface border border-brand-border rounded-[2px] p-4 md:p-8">
      <div className="flex items-center gap-3 mb-4 md:mb-6">
        <History className="w-5 h-5 md:w-6 md:h-6 text-brand-lime" />
        <h2 className="font-display text-xl md:text-2xl font-bold">Games Created</h2>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-brand-border">
              <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-brand-muted font-medium">Game</th>
              <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-brand-muted font-medium">Mode</th>
              <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-brand-muted font-medium">Date</th>
              <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-brand-muted font-medium text-right">Participants</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {games.map((game, i) => {
              const targetUrl = isOwnProfile ? `/dashboard/game/${game.id}` : `/play/${game.id}/results`;
              return (
                <tr key={i} className="border-b border-brand-border/50 hover:bg-brand-black/50 transition-colors group">
                  <td className="py-4 px-4 font-bold">{game.title}</td>
                  <td className="py-4 px-4">
                    <span className="font-mono text-xs border border-brand-border px-2 py-1 rounded-[2px] text-brand-muted">{game.mode}</span>
                  </td>
                  <td className="py-4 px-4 text-sm text-brand-muted">{game.date}</td>
                  <td className="py-4 px-4 text-right font-mono text-brand-white">
                    <div className="flex items-center justify-end gap-2">
                      <Users className="w-3 h-3 text-brand-muted" />
                      {game.participants}
                    </div>
                  </td>
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
        {games.map((game, i) => {
          const targetUrl = isOwnProfile ? `/dashboard/game/${game.id}` : `/play/${game.id}/results`;
          return (
            <Link key={i} href={targetUrl} className="flex items-center gap-4 py-4 hover:bg-brand-black/30 transition-colors -mx-4 px-4 active:opacity-70">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{game.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono border border-brand-border px-1.5 py-0.5 rounded-[2px] text-brand-muted uppercase">{game.mode}</span>
                  <span className="text-[11px] text-brand-muted">{game.date}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-brand-muted shrink-0">
                <Users className="w-3.5 h-3.5" />
                <span className="font-mono text-sm">{game.participants}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-brand-border shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
