import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { User, LogOut } from "lucide-react";
import NotificationsDropdown from "@/app/components/NotificationsDropdown";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile to ensure onboarding is complete
  const { data: profile } = await supabase
    .from("profiles")
    .select("handle, display_name, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile?.handle) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-brand-black text-brand-white selection:bg-brand-lime selection:text-brand-black overflow-x-hidden flex flex-col">
      {/* Dashboard Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-brand-surface border-b border-brand-border">
        <Link href="/dashboard" className="font-display font-bold text-xl tracking-wider uppercase">
          Ramblee <span className="text-brand-lime text-xs tracking-normal align-top ml-1">BETA</span>
        </Link>
        <div className="flex items-center gap-4">
          <NotificationsDropdown userId={user.id} />
          <Link href="/profile/me" className="flex items-center gap-3 text-sm text-brand-muted hover:text-brand-white transition-colors group">
            <span className="hidden sm:inline-block font-mono">@{profile.handle}</span>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-8 h-8 rounded-[2px] border border-brand-border group-hover:border-brand-lime transition-colors" />
            ) : (
              <div className="w-8 h-8 rounded-[2px] border border-brand-border bg-brand-card flex items-center justify-center group-hover:border-brand-lime transition-colors">
                <User className="w-4 h-4" />
              </div>
            )}
          </Link>
          <div className="h-6 w-px bg-brand-border mx-2"></div>
          <form action="/auth/signout" method="post">
            <button className="p-2 text-brand-muted hover:text-status-wrong transition-colors rounded-[2px]" title="Sign Out">
              <LogOut className="w-5 h-5" />
            </button>
          </form>
        </div>
      </nav>

      {/* Dashboard Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-12">
        {children}
      </main>
    </div>
  );
}
