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
    <div className="bg-brand-surface border border-brand-border rounded-[2px] p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <History className="w-6 h-6 text-brand-lime" />
        <h2 className="font-display text-2xl font-bold">Games Created</h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-brand-border">
              <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-brand-muted font-medium">Game</th>
              <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-brand-muted font-medium">Mode</th>
              <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-brand-muted font-medium">Date</th>
              <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-brand-muted font-medium text-right">Participants</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {games.map((game, i) => {
              const targetUrl = isOwnProfile ? `/dashboard/game/${game.id}` : `/play/${game.id}/results`;
              return (
                <tr key={i} className="border-b border-brand-border/50 hover:bg-brand-black/50 transition-colors group">
                  <td className="py-4 px-4 font-bold">{game.title}</td>
                  <td className="py-4 px-4">
                    <span className="font-mono text-xs border border-brand-border px-2 py-1 rounded-[2px] text-brand-muted">
                      {game.mode}
                    </span>
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
    </div>
  );
}
