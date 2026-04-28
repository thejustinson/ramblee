"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function PlayerWaitingClient({ game: initialGame, participant }: { game: any; participant: any }) {
  const [game, setGame] = useState(initialGame);
  const supabase = createClient();

  useEffect(() => {
    // Subscribe to game status updates
    const channel = supabase
      .channel('game_status_changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${game.id}`
      }, (payload) => {
        setGame((prev: any) => ({ ...prev, status: payload.new.status }));
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [game.id, supabase]);

  if (game.status === 'active') {
    return (
      <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center p-6 text-brand-white text-center">
        <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(200,255,0,0.1)] pointer-events-none" />
        <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 text-brand-lime animate-pulse">Game is starting!</h1>
        <p className="text-2xl text-brand-muted font-mono">Look at the main screen.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center p-6 text-brand-white text-center">
      <div className="absolute top-6 left-6 font-display font-bold tracking-wider uppercase text-brand-muted">
        Ramblee
      </div>

      <div className="max-w-md w-full flex flex-col items-center">
        <div className="w-20 h-20 bg-brand-surface border border-brand-border rounded-full flex items-center justify-center mb-8 relative">
          <Loader2 className="w-8 h-8 text-brand-lime animate-spin absolute" />
        </div>
        
        <h2 className="font-mono text-brand-lime tracking-widest uppercase mb-4 text-sm">
          You're in!
        </h2>
        <h1 className="font-display text-5xl md:text-6xl font-bold mb-4 leading-tight">
          {game.title}
        </h1>
        <p className="text-xl text-brand-muted mb-12">
          Waiting for the organizer to start the game...
        </p>

        <div className="w-full bg-brand-surface border border-brand-border p-6 rounded-[2px] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-brand-card rounded-full border border-brand-border flex items-center justify-center">
              <span className="font-display font-bold text-lg">{participant?.display_name?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="text-left">
              <div className="text-xs font-mono uppercase tracking-widest text-brand-muted mb-1">Playing as</div>
              <div className="font-bold text-lg">{participant?.display_name}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
