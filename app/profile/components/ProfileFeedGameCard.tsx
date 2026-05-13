"use client";

import { useRouter } from "next/navigation";
import type { ProfileFeedEvent } from "@/utils/feed-events";

function metaString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function metaNumber(v: unknown): number | null {
  return typeof v === "number" && !Number.isNaN(v) ? v : null;
}

export default function ProfileFeedGameCard({
  event,
  isOwnProfile,
  ownerProfileHandle,
}: {
  event: ProfileFeedEvent;
  isOwnProfile: boolean;
  ownerProfileHandle?: string;
}) {
  const router = useRouter();
  const gameId = metaString(event.metadata.game_id);
  const title = metaString(event.metadata.title) ?? "Untitled game";
  const href = gameId ? `/dashboard/game/${gameId}/summary` : null;

  const modeOrCategory = metaString(event.metadata.mode) ?? metaString(event.metadata.category);
  const playerCount = metaNumber(event.metadata.player_count);

  const isRewardEvent = event.event_type === "reward_pending" || event.event_type === "reward_claimed";
  const rewardAmount =
    metaNumber(event.metadata.amount) ?? metaNumber(event.metadata.reward_amount);
  const rewardToken = metaString(event.metadata.token) ?? metaString(event.metadata.reward_token);

  const showRewardOnCover = isRewardEvent || (rewardAmount != null && rewardToken != null);
  const isPendingOwner = isOwnProfile && event.event_type === "reward_pending";

  const position = metaNumber(event.metadata.position);
  const score =
    metaNumber(event.metadata.score) ??
    metaNumber(event.metadata.points) ??
    metaNumber(event.metadata.points_earned);
  const accuracy = metaNumber(event.metadata.accuracy);

  let statusLabel: string;
  let statusLime = false;
  let statusAmber = false;
  if (isPendingOwner) {
    statusLabel = "ACTION NEEDED";
    statusAmber = true;
  } else if (event.event_type === "game_created") {
    statusLabel = "CREATED";
  } else if (isRewardEvent || showRewardOnCover) {
    statusLabel = "REWARD GAME";
    statusLime = true;
  } else {
    statusLabel = "COMPLETED";
  }

  const borderClasses = isPendingOwner
    ? "border border-status-timer shadow-[inset_0_0_0_1px_rgba(251,191,36,0.25)]"
    : showRewardOnCover || isRewardEvent
      ? "border border-brand-border border-l-4 border-l-brand-lime"
      : "border border-brand-border";

  const coverTint = isPendingOwner ? "bg-[linear-gradient(rgba(251,191,36,0.08),rgba(251,191,36,0.08))]" : "";

  const expiresAt = metaString(event.metadata.expires_at);

  function formatExpiresIn(iso: string): string | null {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return null;
    const days = Math.max(0, Math.ceil((t - Date.now()) / (24 * 60 * 60 * 1000)));
    if (days === 0) return "today";
    if (days === 1) return "1 day";
    return `${days} days`;
  }

  const positionOrdinal = (n: number) => {
    if (n === 1) return "1st";
    if (n === 2) return "2nd";
    if (n === 3) return "3rd";
    return `${n}th`;
  };

  const positionClass =
    position === 1
      ? "text-brand-lime"
      : position === 2
        ? "text-brand-white"
        : position === 3
          ? "text-status-timer"
          : "text-brand-muted";

  const showResultRow =
    event.event_type === "game_played" && (position != null || score != null || accuracy != null);

  const goToGame = () => {
    if (href) router.push(href);
  };

  const scrollWallet = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (ownerProfileHandle) {
      router.push(`/profile/${ownerProfileHandle}/edit#wallet-section`);
    } else {
      document.getElementById("wallet-section")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div
      role={href ? "link" : undefined}
      tabIndex={href ? 0 : undefined}
      onClick={href ? goToGame : undefined}
      onKeyDown={
        href
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                goToGame();
              }
            }
          : undefined
      }
      className={`group block rounded-lg overflow-hidden bg-brand-card cursor-pointer ${borderClasses} transition-colors duration-150 hover:border-[#444444] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime/40`}
    >
      <div
        className={`relative min-h-[120px] sm:min-h-[150px] flex-[2] flex flex-col justify-center px-4 py-5 sm:px-5 bg-brand-surface ${coverTint}`}
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: "10px 10px",
        }}
      >
        {showRewardOnCover && rewardAmount != null && rewardToken && (
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-display text-3xl sm:text-4xl font-bold text-brand-white tabular-nums">
              {rewardAmount}
            </span>
            <span className="font-display text-lg text-brand-muted font-semibold">{rewardToken}</span>
          </div>
        )}
        <h3 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-brand-white leading-tight line-clamp-3">
          {title}
        </h3>
      </div>

      <div className="p-3 sm:p-5 flex-[3] bg-brand-card border-t border-brand-border">
        <p className="font-sans text-base font-medium text-brand-white truncate">{title}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {modeOrCategory && (
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-brand-border text-brand-white">
              {modeOrCategory}
            </span>
          )}
          {playerCount != null && (
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-brand-border text-brand-white">
              {playerCount} players
            </span>
          )}
          <span
            className={`font-mono text-xs px-2 py-0.5 rounded-full ml-auto ${
              statusAmber
                ? "bg-brand-black text-status-timer"
                : statusLime
                  ? "bg-brand-black text-brand-lime"
                  : "bg-brand-border text-brand-white"
            }`}
          >
            {statusLabel}
          </span>
        </div>

        {showResultRow && (
          <p className={`mt-3 text-sm ${position != null ? positionClass : "text-brand-muted"} font-sans`}>
            {position != null && (
              <span className={position != null ? "font-display font-bold" : ""}>{positionOrdinal(position)} place</span>
            )}
            {position != null && (score != null || accuracy != null) && (
              <span className="text-brand-muted font-normal"> · </span>
            )}
            {score != null && <span className="text-brand-muted">{score.toLocaleString()} pts</span>}
            {score != null && accuracy != null && <span className="text-brand-muted"> · </span>}
            {accuracy != null && <span className="text-brand-muted">{accuracy}% accuracy</span>}
          </p>
        )}

        {isPendingOwner && (
          <p className="mt-3 text-sm text-status-timer font-sans">
            Reward unclaimed
            {expiresAt && formatExpiresIn(expiresAt) && (
              <>
                {" "}
                · expires in {formatExpiresIn(expiresAt)}
              </>
            )}
            {" · "}
            <button
              type="button"
              className="underline underline-offset-2 text-status-timer hover:text-brand-white bg-transparent border-0 p-0 cursor-pointer font-sans text-sm"
              onClick={scrollWallet}
            >
              Add wallet to claim
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
