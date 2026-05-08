import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, LogOut, LayoutDashboard } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || user.email !== adminEmail) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col">
      {/* Admin Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-[#0f0f0f] border-b border-white/10">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-brand-lime" />
          <span className="font-display font-bold text-lg tracking-wider uppercase">
            Ramblee <span className="text-brand-lime text-xs tracking-normal font-mono">ADMIN</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors font-mono"
          >
            <LayoutDashboard className="w-4 h-4" />
            Back to App
          </Link>
          <div className="h-5 w-px bg-white/10" />
          <form action="/auth/signout" method="post">
            <button className="flex items-center gap-2 text-sm text-white/50 hover:text-red-400 transition-colors font-mono">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </form>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-12">
        {children}
      </main>
    </div>
  );
}
