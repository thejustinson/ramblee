import { Trophy, Target, Zap, Clock } from "lucide-react";

export interface StatItem {
  label: string;
  value: string;
}

export default function GameStatsBlock({ stats }: { stats: StatItem[] }) {
  return (
    <div className="bg-brand-surface border border-brand-border rounded-[2px] p-4 md:p-8">
      <h2 className="font-display text-xl md:text-2xl font-bold mb-4 md:mb-6">Game Statistics</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.label === "Games Played" ? Trophy :
                       stat.label === "Win Rate" ? Target :
                       stat.label === "Avg Accuracy" ? Zap :
                       Clock;
          return (
            <div key={i} className="bg-brand-black border border-brand-border rounded-[2px] p-3 md:p-4 flex flex-col">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-brand-muted leading-tight">{stat.label}</p>
                <Icon className="w-3.5 h-3.5 md:w-4 md:h-4 text-brand-lime opacity-80 shrink-0" />
              </div>
              <h3 className="font-display text-2xl md:text-3xl font-bold text-brand-white">{stat.value}</h3>
            </div>
          );
        })}
      </div>
    </div>
  );
}
