"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center p-6 text-brand-white">
      <Link href="/" className="absolute top-6 left-6 md:top-8 md:left-8 font-display font-bold text-xl tracking-wider uppercase text-brand-muted hover:text-brand-white transition-colors">
        Ramblee
      </Link>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-brand-surface border border-brand-border rounded-[4px] p-8 md:p-12 flex flex-col items-center shadow-2xl"
      >
        <h1 className="font-display text-4xl font-bold mb-3 text-center">Welcome back</h1>
        <p className="text-brand-muted mb-10 text-center leading-relaxed">Sign in to manage your rooms, track your history, and build your stats.</p>
        
        <button 
          onClick={handleGoogleLogin}
          className="w-full py-4 px-6 bg-brand-card border border-brand-border rounded-[2px] hover:border-brand-white transition-colors flex items-center justify-center gap-3 font-medium text-lg mb-8 group"
        >
          {/* Google G icon SVG */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
          <ArrowRight className="w-5 h-5 text-brand-muted group-hover:text-brand-white transition-colors ml-auto" />
        </button>

        <div className="text-center text-sm text-brand-muted max-w-[280px]">
          Don't have an account? It will be automatically created when you continue with Google.
        </div>
      </motion.div>
    </div>
  );
}
