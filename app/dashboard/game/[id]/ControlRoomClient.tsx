"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Play, Users, Loader2, ChevronRight, ExternalLink, Share2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import ShareModal from "@/components/ShareModal";

const AUTO_ADVANCE_SECONDS = 30;

export default function ControlRoomClient({
  game: initialGame,
  questions,
  initialParticipantCount,
}: {
  game: any;
  questions: any[];
  initialParticipantCount: number;
}) {
  const [participantCount, setParticipantCount] = useState(initialParticipantCount);
  const [game, setGame] = useState(initialGame);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [autoTimeLeft, setAutoTimeLeft] = useState<number | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const supabase = createClient();
  const currentQuestionIndex = game.current_question_index ?? -1;
  const currentQuestion = currentQuestionIndex >= 0 ? questions[currentQuestionIndex] : null;
  const isLastQuestion = currentQuestionIndex >= questions.length - 1;

  // Keep a ref to latest advance/end handlers to avoid stale closures in timer
  const advanceRef = useRef<() => void>(() => {});

  const handleNextQuestion = async () => {
    setIsAdvancing(true);
    const nextIndex = currentQuestionIndex + 1;
    const { data } = await supabase
      .from("games")
      .update({ current_question_index: nextIndex, question_started_at: new Date().toISOString() })
      .eq("id", initialGame.id)
      .select().single();
    if (data) setGame(data);
    setIsAdvancing(false);
  };

  const handleEndGame = async () => {
    await supabase.from("games").update({ status: "finished" }).eq("id", initialGame.id);
    setGame((g: any) => ({ ...g, status: "finished" }));
  };

  // Always keep advanceRef current
  useEffect(() => {
    advanceRef.current = isLastQuestion ? handleEndGame : handleNextQuestion;
  });

  // Auto-advance countdown — tied to question_started_at
  useEffect(() => {
    if (!game.question_started_at || game.status !== "active") {
      setAutoTimeLeft(null);
      return;
    }

    const startedAt = new Date(game.question_started_at).getTime();
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    const initial = Math.max(0, AUTO_ADVANCE_SECONDS - elapsed);
    setAutoTimeLeft(initial);

    if (initial === 0) {
      advanceRef.current();
      return;
    }

    let remaining = initial;
    const interval = setInterval(() => {
      remaining -= 1;
      setAutoTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        advanceRef.current();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [game.question_started_at, game.status]);

  // Participants subscription
  useEffect(() => {
    const ch = supabase.channel("ctrl_participants")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "participants", filter: `game_id=eq.${initialGame.id}` },
        () => setParticipantCount((p) => p + 1))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [initialGame.id, supabase]);

  // Answers subscription for current question
  useEffect(() => {
    if (!currentQuestion) { setAnsweredCount(0); return; }
    setAnsweredCount(0);
    const ch = supabase.channel(`ctrl_answers_${currentQuestion.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "answers", filter: `question_id=eq.${currentQuestion.id}` },
        () => setAnsweredCount((a) => a + 1))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [currentQuestion?.id, supabase]);

  const handleLaunch = async () => {
    setIsLaunching(true);
    const { data } = await supabase.from("games")
      .update({ status: "active", current_question_index: -1 })
      .eq("id", initialGame.id).select().single();
    if (data) setGame(data);
    setIsLaunching(false);
  };

  const timerPercent = autoTimeLeft !== null ? (autoTimeLeft / AUTO_ADVANCE_SECONDS) * 100 : 0;

  return (
    <div className="min-h-screen bg-brand-black flex flex-col text-brand-white">
      <header className="border-b border-brand-border bg-brand-surface py-4 px-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-brand-muted hover:text-brand-white transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="font-display font-bold text-xl">{game.title}</h1>
            <div className="font-mono text-xs text-brand-muted uppercase mt-1">Control Room • {game.mode}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 font-mono bg-brand-black px-4 py-2 border border-brand-border rounded-[2px]">
            <span className="text-brand-muted text-sm">CODE:</span>
            <span className="text-brand-lime font-bold tracking-widest text-lg">{game.join_code}</span>
            <button
              onClick={() => setShareOpen(true)}
              title="Share game"
              className="ml-2 text-brand-muted hover:text-brand-lime transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
          <Link href={`/dashboard/game/${initialGame.id}/projection`} target="_blank"
            className="px-4 py-2 border border-brand-border text-brand-muted hover:text-brand-white hover:border-brand-white transition-colors rounded-[2px] flex items-center gap-2 text-sm font-mono">
            <ExternalLink className="w-4 h-4" />Projection
          </Link>
          {game.status === "draft" && (
            <button onClick={handleLaunch} disabled={isLaunching}
              className="px-6 py-2 bg-brand-lime text-brand-black font-semibold rounded-[2px] hover:brightness-110 flex items-center gap-2 disabled:opacity-50">
              {isLaunching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              Launch Room
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {game.status === "active" && (
            <div className="bg-brand-surface border border-brand-lime/30 rounded-[2px] p-6 shadow-[0_0_30px_rgba(200,255,0,0.06)]">
              <div className="flex items-center justify-between mb-4">
                <div className="font-mono text-brand-lime text-sm uppercase tracking-widest">
                  {currentQuestionIndex === -1 ? "Ready to start" : `Q${currentQuestionIndex + 1} of ${questions.length}`}
                </div>
                {currentQuestion && <div className="text-sm font-mono text-brand-muted">{answeredCount}/{participantCount} answered</div>}
              </div>

              {/* Auto-advance timer bar */}
              {autoTimeLeft !== null && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs font-mono text-brand-muted mb-1">
                    <span>Auto-advance</span><span className={autoTimeLeft <= 5 ? "text-red-400" : ""}>{autoTimeLeft}s</span>
                  </div>
                  <div className="w-full h-1.5 bg-brand-card rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ease-linear ${autoTimeLeft <= 5 ? "bg-red-400" : autoTimeLeft <= 10 ? "bg-orange-400" : "bg-brand-lime"}`}
                      style={{ width: `${timerPercent}%` }} />
                  </div>
                </div>
              )}

              {currentQuestion ? (
                <h2 className="font-display text-2xl font-bold mb-4">{currentQuestion.text}</h2>
              ) : (
                <p className="text-brand-muted mb-4">Click "Start First Question" to begin the game.</p>
              )}

              <div className="flex gap-3 flex-wrap">
                {!isLastQuestion ? (
                  <button onClick={handleNextQuestion} disabled={isAdvancing}
                    className="px-6 py-3 bg-brand-lime text-brand-black font-semibold rounded-[2px] hover:brightness-110 flex items-center gap-2 disabled:opacity-50">
                    {isAdvancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                    {currentQuestionIndex === -1 ? "Start First Question" : "Next Question"}
                  </button>
                ) : (
                  currentQuestionIndex >= 0 && (
                    <button onClick={handleEndGame} className="px-6 py-3 border border-status-wrong text-status-wrong font-semibold rounded-[2px] hover:bg-status-wrong/10 transition-all">
                      End Game
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <h2 className="font-display text-xl font-bold">Question Set</h2>
              <span className="font-mono text-brand-muted text-sm">{questions.length} Total</span>
            </div>
            {questions.map((q, idx) => (
              <div key={q.id} className={`bg-brand-surface border rounded-[2px] p-5 transition-colors ${idx === currentQuestionIndex ? "border-brand-lime" : "border-brand-border"}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className={`font-mono text-sm ${idx === currentQuestionIndex ? "text-brand-lime" : "text-brand-muted"}`}>
                    Q{idx + 1}{idx === currentQuestionIndex && " ← Active"}
                  </div>
                  <div className="text-xs font-mono uppercase tracking-widest text-brand-muted border border-brand-border px-2 py-1 rounded-[2px]">{q.difficulty}</div>
                </div>
                <p className="font-display text-lg font-medium">{q.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="border-b border-brand-border pb-4"><h2 className="font-display text-2xl font-bold">Live Room</h2></div>
          <div className="bg-brand-surface border border-brand-border p-8 rounded-[2px] flex flex-col items-center justify-center text-center">
            <Users className={`w-12 h-12 mb-4 ${participantCount > 0 ? "text-brand-lime" : "text-brand-muted"}`} />
            <div className="font-display text-6xl font-bold mb-2">{participantCount}</div>
            <p className="text-brand-muted font-mono uppercase tracking-widest text-sm">Players in Room</p>
          </div>
          {currentQuestion && (
            <div className="bg-brand-surface border border-brand-border p-6 rounded-[2px] flex flex-col items-center text-center">
              <div className="font-display text-4xl font-bold mb-2 text-brand-lime">{answeredCount}</div>
              <p className="text-brand-muted font-mono uppercase tracking-widest text-sm">Answered</p>
              <div className="w-full bg-brand-black rounded-full h-2 mt-4">
                <div className="bg-brand-lime h-2 rounded-full transition-all"
                  style={{ width: participantCount > 0 ? `${(answeredCount / participantCount) * 100}%` : "0%" }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        gameTitle={game.title}
        joinCode={game.join_code}
        questionCount={questions.length}
        reward={initialGame.reward}
      />
    </div>
  );
}
