"use client";

import { useState } from "react";
import { ArrowLeft, Sparkles, AlertCircle } from "lucide-react";
import Link from "next/link";
import { createGame } from "./actions";

export default function CreateGamePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState("Mode B");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData(e.currentTarget);
      // Ensure mode is appended since we control it via state for styling
      formData.set("mode", mode);
      await createGame(formData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-black flex flex-col p-6 md:p-12 text-brand-white">
      <div className="max-w-3xl w-full mx-auto">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-brand-muted hover:text-brand-white transition-colors mb-10 font-mono text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        
        <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">Create New Game</h1>
        <p className="text-brand-muted mb-10 text-lg">Set up your room and let our AI engine generate the questions.</p>

        {error && (
          <div className="mb-8 p-4 bg-status-wrong/10 border border-status-wrong rounded-[2px] flex items-start gap-3 text-status-wrong text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8 bg-brand-surface border border-brand-border p-8 rounded-[2px] shadow-2xl">
          
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-brand-muted mb-2 uppercase tracking-wide font-mono">Game Title</label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="e.g. Sunday Service Youth Cup"
              className="w-full bg-brand-black border border-brand-border rounded-[2px] py-4 px-4 text-brand-white focus:outline-none focus:border-brand-lime transition-colors text-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-muted mb-4 uppercase tracking-wide font-mono">Game Mode</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                onClick={() => setMode("Mode A")}
                className={`p-6 border rounded-[2px] cursor-pointer transition-all ${mode === "Mode A" ? "border-brand-lime bg-brand-lime/5" : "border-brand-border hover:border-brand-white bg-brand-black"}`}
              >
                <h3 className={`font-display text-xl font-bold mb-2 ${mode === "Mode A" ? "text-brand-lime" : "text-brand-white"}`}>Mode A</h3>
                <p className="text-sm text-brand-muted">Open Elimination. Players are eliminated round by round.</p>
              </div>
              <div 
                onClick={() => setMode("Mode B")}
                className={`p-6 border rounded-[2px] cursor-pointer transition-all ${mode === "Mode B" ? "border-brand-lime bg-brand-lime/5" : "border-brand-border hover:border-brand-white bg-brand-black"}`}
              >
                <h3 className={`font-display text-xl font-bold mb-2 ${mode === "Mode B" ? "text-brand-lime" : "text-brand-white"}`}>Mode B</h3>
                <p className="text-sm text-brand-muted">Standard Quiz. Everyone plays all questions.</p>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-brand-muted mb-2 uppercase tracking-wide font-mono">Topic / Notes</label>
            <textarea
              id="topic"
              name="topic"
              rows={5}
              placeholder="Paste your sermon notes, syllabus, or just type a topic like 'The History of Rome'..."
              className="w-full bg-brand-black border border-brand-border rounded-[2px] py-4 px-4 text-brand-white focus:outline-none focus:border-brand-lime transition-colors resize-none"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-5 px-6 bg-brand-lime text-brand-black font-semibold rounded-[2px] hover:brightness-110 transition-all flex items-center justify-center gap-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(200,255,0,0.15)]"
          >
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-brand-black border-t-transparent rounded-full animate-spin" />
                <span>AI is generating questions...</span>
              </div>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Game
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
