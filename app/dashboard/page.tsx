import { createClient } from "@/utils/supabase/server";
import { Plus, History, Trophy, Clock, Target } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  return (
    <div className="flex flex-col gap-12">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 md:w-24 md:h-24 shrink-0 rounded-full overflow-hidden border-2 border-brand-border bg-brand-surface">
            {user?.user_metadata?.avatar_url ? (
              <img 
                src={user.user_metadata.avatar_url} 
                alt={profile?.display_name || "User avatar"} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-display text-brand-muted uppercase">
                {profile?.display_name?.charAt(0) || user?.email?.charAt(0) || "?"}
              </div>
            )}
          </div>
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">
              Welcome back, {profile?.display_name?.split(' ')[0] || 'Player'}
            </h1>
            <p className="text-brand-muted font-mono">@{profile?.handle}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 shrink-0">
          <Link 
            href="/join"
            className="px-6 py-4 border border-brand-border hover:border-brand-white text-brand-white font-semibold rounded-[2px] hover:bg-brand-surface transition-colors flex items-center gap-3"
          >
            Join Game
          </Link>
          <Link 
            href="/create"
            className="px-6 py-4 bg-brand-lime text-brand-black font-semibold rounded-[2px] hover:brightness-110 transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(200,255,0,0.15)] hover:shadow-[0_0_30px_rgba(200,255,0,0.3)]"
          >
            <Plus className="w-5 h-5" />
            Create Game
          </Link>
        </div>
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center border border-dashed border-brand-border rounded-[2px] bg-brand-surface/30">
        <div className="w-16 h-16 bg-brand-card rounded-full flex items-center justify-center mb-6 border border-brand-border text-brand-muted">
          <History className="w-8 h-8" />
        </div>
        <h2 className="font-display text-2xl font-bold mb-3">No games yet</h2>
        <p className="text-brand-muted max-w-md mb-8">
          You haven't played or created any games yet. Start a new game to build your stats and history.
        </p>
        <Link 
          href="/create"
          className="px-6 py-3 border border-brand-white text-brand-white font-medium rounded-[2px] hover:bg-brand-surface transition-colors"
        >
          Create Your First Game
        </Link>
      </div>
    </div>
  );
}
