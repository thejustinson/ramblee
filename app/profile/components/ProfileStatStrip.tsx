export type StatStripValues = {
  gamesPlayed: string;
  winRate: string;
  avgAccuracy: string;
  avgResponse: string;
};

export default function ProfileStatStrip({ values }: { values: StatStripValues }) {
  const items: { label: string; value: string }[] = [
    { label: "Games played", value: values.gamesPlayed },
    { label: "Win rate", value: values.winRate },
    { label: "Avg accuracy", value: values.avgAccuracy },
    { label: "Avg response time", value: values.avgResponse },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 w-full">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={`flex flex-col items-center py-4 px-2 text-center ${
            i % 2 === 1 ? "border-l border-brand-border" : ""
          } ${i >= 2 ? "border-t border-brand-border sm:border-t-0" : ""} ${
            i > 0 ? "sm:border-l sm:border-brand-border" : ""
          }`}
        >
          <p className="font-display text-2xl sm:text-3xl font-bold text-brand-white leading-none">{item.value}</p>
          <p className="font-mono text-[10px] sm:text-xs text-brand-muted uppercase tracking-wider mt-2">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}
