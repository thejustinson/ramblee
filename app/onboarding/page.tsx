"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, AlertCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate handle (alphanumeric and underscores only)
    const handleRegex = /^[a-zA-Z0-9_]{3,15}$/;
    if (!handleRegex.test(handle)) {
      setError("Handle must be 3-15 characters long and contain only letters, numbers, and underscores.");
      setLoading(false);
      return;
    }

    if (displayName.trim().length < 2) {
      setError("Display name must be at least 2 characters long.");
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/login");
      return;
    }

    // Try to update the profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        handle: handle.toLowerCase(),
        display_name: displayName.trim(),
      })
      .eq("id", user.id);

    if (updateError) {
      if (updateError.code === '23505') { // Unique violation in Postgres
        setError("That handle is already taken. Try another one!");
      } else {
        setError("Failed to save profile. Make sure you ran the SQL in the implementation plan.");
        console.error(updateError);
      }
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center p-6 text-brand-white">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-brand-surface border border-brand-border rounded-[4px] p-8 md:p-12 flex flex-col shadow-2xl"
      >
        <h1 className="font-display text-4xl font-bold mb-3">Claim your handle</h1>
        <p className="text-brand-muted mb-8 leading-relaxed">
          You're almost in. Set up your player profile so others can find you on the leaderboards.
        </p>
        
        {error && (
          <div className="mb-6 p-4 bg-status-wrong/10 border border-status-wrong rounded-[2px] flex items-start gap-3 text-status-wrong text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label htmlFor="handle" className="block text-sm font-medium text-brand-muted mb-2">Unique Handle</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted font-mono">@</span>
              <input
                id="handle"
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="fastestmind"
                className="w-full bg-brand-black border border-brand-border rounded-[2px] py-3 pl-10 pr-4 text-brand-white focus:outline-none focus:border-brand-lime font-mono transition-colors"
                required
              />
            </div>
            <p className="mt-2 text-xs text-brand-muted">Letters, numbers, and underscores only. Max 15 chars.</p>
          </div>

          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-brand-muted mb-2">Display Name</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="John Doe"
              className="w-full bg-brand-black border border-brand-border rounded-[2px] py-3 px-4 text-brand-white focus:outline-none focus:border-brand-lime transition-colors"
              required
            />
            <p className="mt-2 text-xs text-brand-muted">This is how you will appear in rooms.</p>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-4 px-6 bg-brand-lime text-brand-black font-semibold rounded-[2px] hover:brightness-110 transition-all flex items-center justify-center gap-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-brand-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Continue to Dashboard
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
