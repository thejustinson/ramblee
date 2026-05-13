import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import IdentityBlock from "../components/IdentityBlock";
import UnclaimedRewardsBanner from "@/app/components/UnclaimedRewardsBanner";
import ProfileFeed from "../components/ProfileFeed";
import ProfileStatStrip from "../components/ProfileStatStrip";
import ProfileSocialRow from "../components/ProfileSocialRow";
import ProfileUpdatedToast from "../components/ProfileUpdatedToast";
import { getProfileFeedEvents, getProfileFeedStats, type ProfileFeedEvent } from "@/utils/feed-events";
import { getGooglePictureFromMetadata } from "@/utils/avatar";

function metaNumber(v: unknown): number | null {
  return typeof v === "number" && !Number.isNaN(v) ? v : null;
}

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("*").eq("handle", handle).single();

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="font-display text-6xl font-bold text-brand-white mb-4">404</h1>
        <p className="text-brand-muted text-xl mb-8">This profile doesn&apos;t exist or has been removed.</p>
        <Link
          href="/dashboard"
          className="px-6 py-3 bg-brand-lime text-brand-black font-bold uppercase rounded-[2px] hover:brightness-110 transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Go Home
        </Link>
      </div>
    );
  }

  const isOwnProfile = user?.id === profile.id;
  const showRewardsPublicly = profile.show_rewards_publicly ?? false;

  const googlePictureUrl =
    isOwnProfile && user ? getGooglePictureFromMetadata(user.user_metadata as Record<string, unknown>) : null;

  const [feedEvents, stats] = await Promise.all<[ProfileFeedEvent[], { label: string; value: string }[]]>([
    getProfileFeedEvents(profile.id, isOwnProfile, showRewardsPublicly),
    getProfileFeedStats(profile.id, isOwnProfile),
  ]);

  type PendingRewardClaim = {
    id: string;
    game_id: string;
    position: number;
    amount: number;
    token: string;
    status: string;
    expires_at: string | null;
    games: { title: string } | null;
  };

  let unclaimedRewards: PendingRewardClaim[] = [];
  if (isOwnProfile) {
    const { data: claims } = await supabase
      .from("reward_payouts")
      .select("id, game_id, position, amount, token, status, expires_at, games(title)")
      .eq("user_id", user!.id)
      .eq("status", "pending_claim");
    unclaimedRewards = claims ?? [];
  }

  let isFollowing = false;
  if (user && !isOwnProfile) {
    const { data } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", profile.id)
      .maybeSingle();
    isFollowing = !!data;
  }

  const { count: followerCount } = await supabase
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("following_id", profile.id);

  const gamesPlayedStr = stats.find((s) => s.label === "Games Played")?.value ?? "0";
  const gamesPlayedNum = parseInt(gamesPlayedStr, 10) || 0;
  const winsInFeed = feedEvents.filter((e) => e.event_type === "game_won").length;
  const winRateStr =
    gamesPlayedNum > 0 ? `${Math.min(100, Math.round((winsInFeed / gamesPlayedNum) * 100))}%` : "—";

  const accuracies = feedEvents
    .map((e) => metaNumber(e.metadata.accuracy))
    .filter((n): n is number => n != null);
  const avgAccuracyStr = accuracies.length
    ? `${Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length)}%`
    : "—";

  const responseTimes = feedEvents
    .map((e) => metaNumber(e.metadata.response_time_ms))
    .filter((n): n is number => n != null);
  const avgResponseStr = responseTimes.length
    ? `${Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)} ms`
    : "—";

  return (
    <>
      <ProfileUpdatedToast />
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <IdentityBlock
          profile={isOwnProfile ? { ...profile, email: user!.email } : profile}
          isOwnProfile={isOwnProfile}
          googlePictureUrl={googlePictureUrl}
        />

        <ProfileStatStrip
          values={{
            gamesPlayed: gamesPlayedStr,
            winRate: winRateStr,
            avgAccuracy: avgAccuracyStr,
            avgResponse: avgResponseStr,
          }}
        />

        <ProfileSocialRow
          targetUserId={profile.id}
          followerCount={followerCount ?? 0}
          isOwnProfile={isOwnProfile}
          initialIsFollowing={isFollowing}
        />

        <hr className="border-0 border-t border-brand-border" />

        {!isOwnProfile && !showRewardsPublicly && (
          <div className="border border-brand-border rounded-lg p-4 text-sm text-brand-muted">
            This user has chosen to hide reward activity from their public profile.
          </div>
        )}

        {isOwnProfile && unclaimedRewards.length > 0 && (
          <UnclaimedRewardsBanner claims={unclaimedRewards} hasInAppWallet={!!profile.wallet_address} />
        )}

        <ProfileFeed
          events={feedEvents}
          isOwnProfile={isOwnProfile}
          displayName={profile.display_name}
          ownerProfileHandle={isOwnProfile ? profile.handle : undefined}
        />
      </div>
    </>
  );
}
