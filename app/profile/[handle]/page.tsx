import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import IdentityBlock from "../components/IdentityBlock";
import WalletBlock from "../components/WalletBlock";
import GameStatsBlock from "../components/GameStatsBlock";
import PlayHistoryBlock from "../components/PlayHistoryBlock";
import GamesCreatedBlock from "../components/GamesCreatedBlock";
import FollowButton from "../components/FollowButton";
import TransactionHistory from "../components/TransactionHistory";
import UnclaimedRewardsBanner from "@/app/components/UnclaimedRewardsBanner";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProfileStats } from "@/utils/stats";

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch the profile by handle
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", handle)
    .single();

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="font-display text-6xl font-bold text-brand-white mb-4">404</h1>
        <p className="text-brand-muted text-xl mb-8">This profile doesn&apos;t exist or has been removed.</p>
        <Link href="/dashboard" className="px-6 py-3 bg-brand-lime text-brand-black font-bold uppercase rounded-[2px] hover:brightness-110 transition-all flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Go Home
        </Link>
      </div>
    );
  }

  // Determine if the logged-in user is viewing their own profile
  const isOwnProfile = user?.id === profile.id;

  // ── Data for own profile ────────────────────────────────────────────────────
  let unclaimedRewards: any[] = [];

  if (isOwnProfile) {
    const { data: claims } = await supabase
      .from('reward_payouts')
      .select('id, game_id, position, amount, token, status, expires_at, games(title)')
      .eq('user_id', user!.id)
      .eq('status', 'pending_claim');
    unclaimedRewards = claims ?? [];
  }

  // ── Shared data ─────────────────────────────────────────────────────────────
  const { stats, history, createdGames } = await getProfileStats(profile.id);

  // Follow state (only needed for other profiles)
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

  return (
    <>
      <IdentityBlock
        profile={isOwnProfile ? { ...profile, email: user!.email } : profile}
        isOwnProfile={isOwnProfile}
      />

      {/* Follow system — left-aligned for own profile, inline for others */}
      <div className={`flex mb-4 ${isOwnProfile ? "justify-start" : ""}`}>
        <FollowButton
          targetUserId={profile.id}
          initialIsFollowing={isFollowing}
          followerCount={followerCount || 0}
          isOwnProfile={isOwnProfile}
        />
      </div>

      {/* Own-profile extras */}
      {isOwnProfile && (
        <>
          {unclaimedRewards.length > 0 && (
            <UnclaimedRewardsBanner
              claims={unclaimedRewards}
              hasInAppWallet={!!profile.wallet_address}
            />
          )}

          <WalletBlock
            walletAddress={profile.wallet_address}
          />

          <TransactionHistory />
        </>
      )}

      <GameStatsBlock stats={stats} />

      <GamesCreatedBlock games={createdGames} isOwnProfile={isOwnProfile} />

      <PlayHistoryBlock history={history} currentUserId={user?.id} />

      {/* Danger Zone — own profile only */}
      {isOwnProfile && (
        <div className="bg-brand-surface border border-status-wrong/30 rounded-[2px] p-6 md:p-8">
          <h2 className="font-display text-xl font-bold text-status-wrong mb-2">Danger Zone</h2>
          <p className="text-brand-muted text-sm mb-6">Irreversible actions for your account.</p>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-brand-black border border-brand-border rounded-[2px]">
            <div>
              <h4 className="font-bold text-sm text-brand-white">Delete Account</h4>
              <p className="text-xs text-brand-muted">Permanently delete your account and all data.</p>
            </div>
            <button disabled className="px-4 py-2 text-sm font-bold text-brand-black bg-status-wrong/50 cursor-not-allowed rounded-[2px] uppercase">
              Coming Soon
            </button>
          </div>
        </div>
      )}
    </>
  );
}
