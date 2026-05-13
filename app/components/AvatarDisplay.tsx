import type { ResolvedAvatar } from "@/utils/avatar";

export default function AvatarDisplay({
  resolved,
  sizeClass = "w-16 h-16",
  className = "",
}: {
  resolved: ResolvedAvatar;
  sizeClass?: string;
  className?: string;
}) {
  if (resolved.kind === "image") {
    return (
      <div className={`rounded-full overflow-hidden border border-brand-border bg-brand-black shrink-0 ${sizeClass} ${className}`}>
        <img src={resolved.url} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className={`rounded-full border border-brand-border bg-brand-surface flex items-center justify-center shrink-0 font-display font-bold text-brand-white ${sizeClass} ${className}`}
      aria-hidden
    >
      {resolved.letter}
    </div>
  );
}
