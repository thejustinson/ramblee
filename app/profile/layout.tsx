import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import NotificationsDropdown from "@/app/components/NotificationsDropdown";
import BackButton from "@/app/components/BackButton";

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-brand-black text-brand-white selection:bg-brand-lime selection:text-brand-black font-sans flex flex-col">
      <nav className="sticky top-0 z-50 flex items-center px-4 md:px-12 py-3 md:py-4 bg-brand-surface/80 backdrop-blur-md border-b border-brand-border">
        <BackButton />
        <div className="ml-auto flex items-center gap-3 md:gap-6">
          {user && <NotificationsDropdown userId={user.id} />}
          <Link href="/dashboard" className="font-display font-bold text-lg md:text-xl tracking-wider uppercase hover:text-brand-lime transition-colors">
            Ramblee <span className="text-brand-lime text-xs tracking-normal align-top ml-1">BETA</span>
          </Link>
        </div>
      </nav>
      
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 md:py-12 space-y-8 md:space-y-10">
        {children}
      </main>
    </div>
  );
}
