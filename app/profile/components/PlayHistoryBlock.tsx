import Link from "next/link";
import { ChevronRight } from "lucide-react";

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
    <div className="bg-brand-surface border border-brand-border rounded-[2px] p-6 md:p-8">
      <h2 className="font-display text-2xl font-bold mb-6">Play History</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-brand-border">
              <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-brand-muted font-medium">Game</th>
              <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-brand-muted font-medium">Date</th>
              <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-brand-muted font-medium">Position</th>
              <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-brand-muted font-medium text-right">Score</th>
              <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-brand-muted font-medium text-right">Accuracy</th>
              <th className="py-3 px-4"></th>
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
                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-[2px] text-xs font-bold ${
                      game.position === "1st" ? "bg-brand-lime text-brand-black" : "bg-brand-surface border border-brand-border"
                    }`}>
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
      
      <div className="mt-6 text-center">
        <button className="text-sm font-medium text-brand-muted hover:text-brand-lime transition-colors underline decoration-dashed underline-offset-4">
          Load More
        </button>
      </div>
    </div>
  );
}
