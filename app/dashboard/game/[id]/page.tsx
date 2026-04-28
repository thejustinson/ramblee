import { createClient } from "@/utils/supabase/server";
import { ArrowLeft, Play, Settings, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function GameControlRoom({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch Game
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .single();

  if (gameError || !game || game.organiser_id !== user?.id) {
    notFound();
  }

  // Fetch Questions
  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("game_id", game.id)
    .order("order_index", { ascending: true });

  return (
    <div className="min-h-screen bg-brand-black flex flex-col text-brand-white">
      {/* Top Bar */}
      <header className="border-b border-brand-border bg-brand-surface py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-brand-muted hover:text-brand-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-display font-bold text-xl">{game.title}</h1>
            <div className="font-mono text-xs text-brand-muted uppercase mt-1">Control Room • {game.mode}</div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-mono text-lg bg-brand-black px-4 py-2 border border-brand-border rounded-[2px]">
            <span className="text-brand-muted text-sm">ROOM CODE:</span>
            <span className="text-brand-lime font-bold tracking-widest">{game.join_code}</span>
          </div>
          <button className="px-6 py-2 bg-brand-lime text-brand-black font-semibold rounded-[2px] hover:brightness-110 transition-all flex items-center gap-2">
            <Play className="w-4 h-4 fill-current" />
            Launch Screen
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Questions */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-brand-border pb-4">
            <h2 className="font-display text-2xl font-bold">Question Set</h2>
            <span className="font-mono text-brand-muted">{questions?.length || 0} Total</span>
          </div>
          
          <div className="flex flex-col gap-4">
            {questions?.map((q, idx) => (
              <div key={q.id} className="bg-brand-surface border border-brand-border p-6 rounded-[2px]">
                <div className="flex justify-between items-start mb-4">
                  <div className="font-mono text-brand-lime text-sm">Q{idx + 1}</div>
                  <div className="text-xs font-mono uppercase tracking-widest text-brand-muted border border-brand-border px-2 py-1 rounded-[2px]">
                    {q.difficulty}
                  </div>
                </div>
                <h3 className="font-display text-xl font-medium mb-6">{q.text}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {q.options.map((opt: any) => (
                    <div 
                      key={opt.label}
                      className={`p-3 border rounded-[2px] flex items-center gap-3 text-sm ${opt.label === q.correct_answer ? 'border-status-correct bg-status-correct/10 text-status-correct' : 'border-brand-border text-brand-muted'}`}
                    >
                      <div className="w-6 h-6 flex items-center justify-center border border-current rounded-[2px] font-mono text-xs font-bold shrink-0">
                        {opt.label}
                      </div>
                      <span>{opt.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Live Stats */}
        <div className="flex flex-col gap-6">
           <div className="flex items-center justify-between border-b border-brand-border pb-4">
            <h2 className="font-display text-2xl font-bold">Live Room</h2>
          </div>
          
          <div className="bg-brand-surface border border-brand-border p-8 rounded-[2px] flex flex-col items-center justify-center text-center aspect-square">
            <Users className="w-12 h-12 text-brand-muted mb-4" />
            <div className="font-display text-6xl font-bold mb-2">0</div>
            <p className="text-brand-muted font-mono uppercase tracking-widest text-sm">Players Waiting</p>
          </div>
        </div>

      </div>
    </div>
  );
}
