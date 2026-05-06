import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import IdentityBlock from "../components/IdentityBlock";
import GameStatsBlock from "../components/GameStatsBlock";
import PlayHistoryBlock from "../components/PlayHistoryBlock";
import GamesCreatedBlock from "../components/GamesCreatedBlock";
import FollowButton from "../components/FollowButton";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProfileStats } from "@/utils/stats";

export default async function PublicProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch the public profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", handle)
    .single();

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="font-display text-6xl font-bold text-brand-white mb-4">404</h1>
        <p className="text-brand-muted text-xl mb-8">This profile doesn't exist or has been removed.</p>
        <Link href="/dashboard" className="px-6 py-3 bg-brand-lime text-brand-black font-bold uppercase rounded-[2px] hover:brightness-110 transition-all flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Go Home
        </Link>
      </div>
    );
  }

  const isOwnProfile = user?.id === profile.id;
  
  // Check if currently following
  let isFollowing = false;
  if (user) {
    const { data } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", profile.id)
      .maybeSingle();
    isFollowing = !!data;
  }
  
  // Get follower count
  const { count: followerCount } = await supabase
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("following_id", profile.id);

  // Fetch actual game stats
  const { stats, history, createdGames } = await getProfileStats(profile.id);

  return (
    <>
      <IdentityBlock profile={profile} isOwnProfile={isOwnProfile} />
      
      {/* Follow System */}
      {!isOwnProfile && (
        <FollowButton 
          targetUserId={profile.id} 
          initialIsFollowing={isFollowing} 
          followerCount={followerCount || 0} 
        />
      )}

      <GameStatsBlock stats={stats} />
      
      <GamesCreatedBlock games={createdGames} isOwnProfile={isOwnProfile} />

      <PlayHistoryBlock history={history} currentUserId={user?.id} />
    </>
  );
}
