"use client";

import { useState } from "react";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import FollowersModal from "./FollowersModal";

export default function FollowButton({ 
  targetUserId, 
  initialIsFollowing, 
  followerCount = 0,
  isOwnProfile = false
}: { 
  targetUserId: string, 
  initialIsFollowing: boolean,
  followerCount?: number,
  isOwnProfile?: boolean
}) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [count, setCount] = useState(followerCount);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const toggleFollow = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId);
          
        if (error) throw error;
        setIsFollowing(false);
        setCount(c => Math.max(0, c - 1));
      } else {
        // Follow
        const { error } = await supabase
          .from("follows")
          .insert({
            follower_id: user.id,
            following_id: targetUserId
          });
          
        if (error) throw error;
        
        // Insert notification (fail silently if it fails, don't break follow flow)
        const { data: profile } = await supabase.from('profiles').select('display_name, handle').eq('id', user.id).single();
        if (profile) {
          await supabase.from("notifications").insert({
            user_id: targetUserId,
            actor_id: user.id,
            type: "follow",
            message: `${profile.display_name} started following you.`,
            link: `/profile/${profile.handle}`
          });
        }

        setIsFollowing(true);
        setCount(c => c + 1);
      }
      
      router.refresh();
    } catch (err) {
      console.error("Follow error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4">
        {!isOwnProfile && (
          <button 
            onClick={toggleFollow}
            disabled={isLoading}
            className={`px-8 py-3 transition-colors rounded-[2px] font-bold uppercase text-sm flex items-center justify-center gap-2 min-w-[140px] disabled:opacity-50 ${
              isFollowing 
                ? "bg-brand-surface border border-brand-border text-brand-white hover:border-status-wrong hover:text-status-wrong"
                : "bg-brand-white text-brand-black hover:bg-brand-lime"
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isFollowing ? (
              <>Unfollow <UserMinus className="w-4 h-4" /></>
            ) : (
              <>Follow <UserPlus className="w-4 h-4" /></>
            )}
          </button>
        )}
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex flex-col text-left hover:text-brand-lime transition-colors group cursor-pointer"
        >
          <span className="font-display font-bold text-xl group-hover:text-brand-lime transition-colors">{count}</span>
          <span className="text-[10px] uppercase tracking-widest text-brand-muted group-hover:text-brand-lime/80 transition-colors">Followers</span>
        </button>
      </div>

      <FollowersModal 
        targetUserId={targetUserId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
