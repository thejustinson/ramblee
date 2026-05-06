"use client";

import { useState } from "react";
import { ArrowRight, AlertCircle } from "lucide-react";
import Link from "next/link";
import { joinGame } from "./actions";

import { useRouter } from "next/navigation";

export default function JoinForm({ initialCode = "", defaultName = "" }: { initialCode?: string; defaultName?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await joinGame(formData);
      
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else if (result?.url) {
        setSuccess("Successfully joined room! Redirecting...");
        router.push(result.url);
      }
    } catch (err: any) {
      setError(err.message || "Failed to join room.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center p-6 text-brand-white">
      <Link href="/" className="absolute top-6 left-6 md:top-8 md:left-8 font-display font-bold text-xl tracking-wider uppercase text-brand-muted hover:text-brand-white transition-colors">
        Ramblee
      </Link>

      <div className="w-full max-w-md bg-brand-surface border border-brand-border rounded-[2px] p-8 md:p-12 shadow-2xl flex flex-col">
        <h1 className="font-display text-4xl font-bold mb-3 text-center">Join Room</h1>
        <p className="text-brand-muted mb-8 text-center">
          {initialCode ? "Your room code is pre-filled — just add your name!" : "Enter the 6-character code from the screen."}
        </p>

        {error && (
          <div className="mb-6 p-4 bg-status-wrong/10 border border-status-wrong rounded-[2px] flex items-start gap-3 text-status-wrong text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" /><p>{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-brand-lime/10 border border-brand-lime rounded-[2px] flex items-start gap-3 text-brand-lime text-sm">
            <div className="w-5 h-5 shrink-0 flex items-center justify-center rounded-full border border-brand-lime"><span className="text-xs">✓</span></div>
            <p>{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label htmlFor="joinCode" className="block text-sm font-medium text-brand-muted mb-2 uppercase font-mono tracking-widest text-center">Room Code</label>
            <input
              id="joinCode"
              name="joinCode"
              type="text"
              maxLength={6}
              defaultValue={initialCode}
              placeholder="XXXXXX"
              className={`w-full bg-brand-black border rounded-[2px] py-4 px-4 text-brand-white focus:outline-none focus:border-brand-lime font-mono text-3xl text-center tracking-[0.5em] uppercase transition-colors ${
                initialCode ? "border-brand-lime" : "border-brand-border"
              }`}
              required
            />
            {initialCode && (
              <p className="text-center text-brand-lime font-mono text-xs uppercase tracking-widest mt-2">✓ Code pre-filled from link</p>
            )}
          </div>

          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-brand-muted mb-2 uppercase font-mono tracking-widest text-center">Display Name</label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              placeholder="Your name"
              defaultValue={defaultName}
              className="w-full bg-brand-black border border-brand-border rounded-[2px] py-4 px-4 text-brand-white focus:outline-none focus:border-brand-lime font-medium text-xl text-center transition-colors"
              required
            />
          </div>

          <button type="submit" disabled={loading}
            className="w-full mt-4 py-5 px-6 bg-brand-lime text-brand-black font-bold uppercase tracking-wide rounded-[2px] hover:brightness-110 transition-all flex items-center justify-center gap-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(200,255,0,0.15)]">
            {loading ? (
              <div className="w-6 h-6 border-2 border-brand-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>Join Now<ArrowRight className="w-5 h-5" /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
