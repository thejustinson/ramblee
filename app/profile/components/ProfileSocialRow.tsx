"use client";

import { useState, useEffect } from "react";
import FollowButton from "./FollowButton";
import FollowersModal from "./FollowersModal";
import FollowingModal from "./FollowingModal";
import { createClient } from "@/utils/supabase/client";

export default function ProfileSocialRow({
  targetUserId,
  followerCount,
  isOwnProfile,
  initialIsFollowing,
}: {
  targetUserId: string;
  followerCount: number;
  isOwnProfile: boolean;
  initialIsFollowing: boolean;
}) {
  const [open, setOpen] = useState<"followers" | "following" | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const { count } = await supabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("follower_id", targetUserId);
      if (!cancelled) setFollowingCount(count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [targetUserId]);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-sans text-sm text-brand-muted">
        <button
          type="button"
          onClick={() => setOpen("followers")}
          className="hover:text-brand-white transition-colors"
        >
          {followerCount} follower{followerCount === 1 ? "" : "s"}
        </button>
        <span className="text-brand-muted mx-1">·</span>
        <button
          type="button"
          onClick={() => setOpen("following")}
          className="hover:text-brand-white transition-colors"
        >
          {followingCount ?? "—"} following
        </button>
      </p>

      {!isOwnProfile && (
        <FollowButton
          targetUserId={targetUserId}
          initialIsFollowing={initialIsFollowing}
          followerCount={followerCount}
          isOwnProfile={false}
          showFollowerCounts={false}
        />
      )}

      <FollowersModal targetUserId={targetUserId} isOpen={open === "followers"} onClose={() => setOpen(null)} />
      <FollowingModal targetUserId={targetUserId} isOpen={open === "following"} onClose={() => setOpen(null)} />
    </div>
  );
}
