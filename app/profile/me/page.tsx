import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import IdentityBlock from "../components/IdentityBlock";
import WalletBlock from "../components/WalletBlock";
import GameStatsBlock from "../components/GameStatsBlock";
import PlayHistoryBlock from "../components/PlayHistoryBlock";
import GamesCreatedBlock from "../components/GamesCreatedBlock";
import FollowButton from "../components/FollowButton";
import TransactionHistory from "../components/TransactionHistory";
import UnclaimedRewardsBanner from "@/app/components/UnclaimedRewardsBanner";
import { getTokenBalance, USDC_MINT, USDG_MINT } from "@/utils/solana";
import { getProfileStats } from "@/utils/stats";

export default async function OwnProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/onboarding");
  }

  // Fetch real-time token balances from Solana RPC
  const usdcBalance = await getTokenBalance(profile.wallet_address, USDC_MINT);
  const usdgBalance = await getTokenBalance(profile.wallet_address, USDG_MINT);

  // Fetch actual game stats
  const { stats, history, createdGames } = await getProfileStats(user.id);

  // Fetch unclaimed rewards
  const { data: unclaimedRewards } = await supabase
    .from("reward_claims")
    .select("id, game_id, position, amount, token, status, games(title)")
    .eq("user_id", user.id)
    .eq("status", "unclaimed");

  // Get follower count
  const { count: followerCount } = await supabase
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("following_id", user.id);

  return (
    <>
      <IdentityBlock profile={{...profile, email: user.email}} isOwnProfile={true} />
      
      <div className="flex justify-start mb-4">
        <FollowButton 
          targetUserId={user.id} 
          initialIsFollowing={false} 
          followerCount={followerCount || 0} 
          isOwnProfile={true}
        />
      </div>

      {/* Unclaimed Rewards Banner */}
      {unclaimedRewards && unclaimedRewards.length > 0 && (
        <UnclaimedRewardsBanner
          claims={unclaimedRewards as any}
          hasInAppWallet={!!profile.wallet_address}
        />
      )}

      <WalletBlock 
        walletAddress={profile.wallet_address} 
        usdcBalance={usdcBalance} 
        usdgBalance={usdgBalance} 
      />
      
      <TransactionHistory />

      <GameStatsBlock stats={stats} />
      
      <GamesCreatedBlock games={createdGames} isOwnProfile={true} />
      
      <PlayHistoryBlock history={history} currentUserId={user.id} />

      {/* Danger Zone */}
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
    </>
  );
}
