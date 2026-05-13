import type { ProfileFeedEvent } from "@/utils/feed-events";

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.floor((now - then) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week} week${week === 1 ? "" : "s"} ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month} month${month === 1 ? "" : "s"} ago`;
  const year = Math.floor(day / 365);
  return `${year} year${year === 1 ? "" : "s"} ago`;
}

function actionPhrase(event: ProfileFeedEvent): string {
  switch (event.event_type) {
    case "game_created":
      return "created a game";
    case "game_played":
      return "played a game";
    case "game_won": {
      const pos = typeof event.metadata.position === "number" ? event.metadata.position : 1;
      if (pos === 1) return "finished 1st";
      if (pos === 2) return "finished 2nd";
      if (pos === 3) return "finished 3rd";
      return `finished ${pos}th`;
    }
    case "reward_pending":
      return "has a reward to claim";
    case "reward_claimed":
      return "claimed a reward";
    default:
      return "activity";
  }
}

export default function ProfileActivityLine({
  displayName,
  event,
}: {
  displayName: string;
  event: ProfileFeedEvent;
}) {
  const action = actionPhrase(event);
  const rel = formatRelativeTime(event.created_at);
  const shortName = displayName.length > 28 ? `${displayName.slice(0, 28)}…` : displayName;

  return (
    <p className="text-sm text-brand-white font-sans flex flex-wrap items-baseline gap-x-1 min-w-0">
      <span className="text-brand-white font-normal truncate max-w-[10rem] sm:max-w-[14rem]">{shortName}</span>
      <span className="text-brand-muted font-normal whitespace-nowrap">{action}</span>
      <span className="text-brand-muted font-mono text-sm shrink-0">· {rel}</span>
    </p>
  );
}
