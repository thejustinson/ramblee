"use client";

import { useState, useEffect } from "react";
import { X, User, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

interface Follower {
  follower_id: string;
  profiles: {
    handle: string;
    display_name: string;
    avatar_url: string;
  };
}

export default function FollowersModal({ 
  targetUserId, 
  isOpen, 
  onClose 
}: { 
  targetUserId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen) return;

    const fetchFollowers = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id, profiles!follower_id(handle, display_name, avatar_url)")
        .eq("following_id", targetUserId);

      if (!error && data) {
        setFollowers(data as any);
      }
      setIsLoading(false);
    };

    fetchFollowers();
  }, [isOpen, targetUserId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-black/80 backdrop-blur-sm p-4">
      <div className="bg-brand-surface border border-brand-border rounded-[2px] w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-6 border-b border-brand-border">
          <h2 className="font-display text-2xl font-bold text-brand-white">Followers</h2>
          <button onClick={onClose} className="p-2 text-brand-muted hover:text-brand-white transition-colors rounded-[2px]">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-brand-lime animate-spin" />
            </div>
          ) : followers.length === 0 ? (
            <div className="text-center py-12 text-brand-muted">
              No followers yet.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {followers.map((f, i) => (
                <Link key={i} href={`/profile/${f.profiles.handle}`} className="flex items-center gap-4 p-3 hover:bg-brand-black/50 border border-transparent hover:border-brand-border rounded-[2px] transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-brand-black border border-brand-border overflow-hidden shrink-0">
                    {f.profiles.avatar_url ? (
                      <img src={f.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-brand-muted">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-brand-white group-hover:text-brand-lime transition-colors">
                      {f.profiles.display_name}
                    </div>
                    <div className="font-mono text-xs text-brand-muted">
                      @{f.profiles.handle}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
