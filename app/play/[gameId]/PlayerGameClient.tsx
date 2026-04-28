"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const ANSWER_LABELS = ["A", "B", "C", "D"];
const ANSWER_COLORS = [
  "from-blue-700 to-blue-600 border-blue-500",
  "from-orange-700 to-orange-600 border-orange-500",
  "from-green-700 to-green-600 border-green-500",
  "from-purple-700 to-purple-600 border-purple-500",
];

type GameState = "waiting" | "question" | "answered" | "finished";

interface AnswerResult {
  is_correct: boolean;
  points_earned: number;
  correct_answer: string;
}

export default function PlayerGameClient({
  initialGame,
  questions,
  participant,
  initialTotalPoints = 0,
  answeredQuestionIds = [],
}: {
  initialGame: any;
  questions: any[];
  participant: any;
  initialTotalPoints?: number;
  answeredQuestionIds?: string[];
}) {
  const TIME_LIMIT = initialGame.time_per_question || 30;
  const [game, setGame] = useState(initialGame);

  // Determine initial game state accounting for already-answered questions
  const getInitialState = () => {
    if (initialGame.status === "finished") return "finished";
    if (initialGame.status === "active" && (initialGame.current_question_index ?? -1) >= 0) {
      const curQ = questions[initialGame.current_question_index];
      if (curQ && answeredQuestionIds.includes(curQ.id)) return "answered";
      return "question";
    }
    return "waiting";
  };

  const [gameState, setGameState] = useState<GameState>(getInitialState);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalPoints, setTotalPoints] = useState(initialTotalPoints);

  const supabase = createClient();

  const currentQuestion = game.current_question_index >= 0 ? questions[game.current_question_index] : null;

  // Reset per-question state when question changes
  const resetForNewQuestion = useCallback(() => {
    setSelectedAnswer(null);
    setAnswerResult(null);
    setTimeLeft(TIME_LIMIT);
    setIsSubmitting(false);
  }, []);

  // Listen for game state changes (organizer advances questions)
  useEffect(() => {
    const channel = supabase
      .channel("game_updates_player")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${initialGame.id}` },
        (payload: any) => {
          const updated = payload.new;
          setGame((prev: any) => ({ ...prev, ...updated }));

          if (updated.status === "finished") {
            setGameState("finished");
            return;
          }

          if (updated.status === "active" && updated.current_question_index >= 0) {
            resetForNewQuestion();
            setGameState("question");
          } else if (updated.status === "active" && updated.current_question_index === -1) {
            setGameState("waiting");
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [initialGame.id, supabase, resetForNewQuestion]);

  // Countdown timer
  useEffect(() => {
    if (gameState !== "question" || selectedAnswer) return;

    const interval = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1) {
          clearInterval(interval);
          setGameState("answered");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, game.current_question_index, selectedAnswer]);

  const handleAnswer = async (label: string) => {
    if (selectedAnswer || isSubmitting || !currentQuestion) return;

    setSelectedAnswer(label);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/play/${initialGame.id}/submitAnswer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: initialGame.id,
          questionId: currentQuestion.id,
          participantId: participant.id,
          chosenAnswer: label,
          questionStartedAt: game.question_started_at,
        }),
      });

      const result: AnswerResult = await res.json();
      setAnswerResult(result);
      setTotalPoints((prev) => prev + result.points_earned);
      setGameState("answered");
    } catch (err) {
      console.error("Failed to submit answer:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── WAITING STATE ────────────────────────────────────────────────────────
  if (gameState === "waiting") {
    return (
      <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center p-6 text-brand-white text-center">
        <div className="absolute top-6 left-6 font-display font-bold tracking-wider uppercase text-brand-muted">Ramblee</div>
        <div className="max-w-md w-full flex flex-col items-center">
          <div className="w-20 h-20 bg-brand-surface border border-brand-border rounded-full flex items-center justify-center mb-8 relative">
            <Loader2 className="w-8 h-8 text-brand-lime animate-spin" />
          </div>
          <h2 className="font-mono text-brand-lime tracking-widest uppercase mb-4 text-sm">You're in!</h2>
          <h1 className="font-display text-5xl font-bold mb-4">{game.title}</h1>
          <p className="text-xl text-brand-muted mb-12">Waiting for the organizer to start the game...</p>
          <div className="w-full bg-brand-surface border border-brand-border p-6 rounded-[2px] flex items-center gap-4">
            <div className="w-10 h-10 bg-brand-card rounded-full border border-brand-border flex items-center justify-center shrink-0">
              <span className="font-display font-bold text-lg">{participant?.display_name?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="text-left">
              <div className="text-xs font-mono uppercase tracking-widest text-brand-muted mb-1">Playing as</div>
              <div className="font-bold text-lg">{participant?.display_name}</div>
            </div>
            {totalPoints > 0 && (
              <div className="ml-auto text-right">
                <div className="text-xs font-mono uppercase tracking-widest text-brand-muted mb-1">Points</div>
                <div className="font-display font-bold text-brand-lime text-2xl">{totalPoints}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── FINISHED STATE ───────────────────────────────────────────────────────
  if (gameState === "finished") {
    return (
      <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center p-6 text-brand-white text-center">
        <h1 className="font-display text-6xl font-bold text-brand-lime mb-3">Game Over!</h1>
        <p className="text-xl text-brand-muted mb-10">Thanks for playing</p>

        <div className="bg-brand-surface border border-brand-border rounded-[2px] p-8 mb-8 w-full max-w-sm">
          <div className="text-brand-muted text-sm font-mono uppercase tracking-widest mb-2">Your Final Score</div>
          <div className="font-display text-6xl font-bold text-brand-lime">{totalPoints}</div>
          <div className="text-brand-muted font-mono text-sm mt-1">points</div>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-sm">
          {game.reward && (
            <div className="p-5 border border-brand-lime bg-brand-lime/10 rounded-[2px]">
              <div className="text-xs font-mono uppercase tracking-widest text-brand-lime mb-2">🎁 Prize / Reward</div>
              <p className="text-brand-white font-semibold text-lg mb-4">{game.reward}</p>
              <button className="w-full py-3 bg-brand-lime text-brand-black font-bold rounded-[2px] hover:brightness-110 transition-all">
                🎉 Claim Reward
              </button>
            </div>
          )}
          <a href={`/play/${initialGame.id}/results`}
            className="w-full py-4 bg-brand-lime text-brand-black font-bold rounded-[2px] hover:brightness-110 transition-all text-center block">
            View Leaderboard
          </a>
          <a href="/dashboard"
            className="w-full py-4 border border-brand-border text-brand-white font-medium rounded-[2px] hover:bg-brand-surface transition-colors text-center block">
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Guard: if question data isn't ready yet (transient state), show waiting screen
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center p-6 text-brand-white text-center">
        <Loader2 className="w-12 h-12 text-brand-lime animate-spin mb-6" />
        <p className="text-brand-muted font-mono uppercase tracking-widest text-sm">Loading question...</p>
      </div>
    );
  }

  const timerPercent = (timeLeft / TIME_LIMIT) * 100;
  const timerColor = timeLeft > 10 ? "bg-brand-lime" : timeLeft > 5 ? "bg-orange-400" : "bg-red-500";

  // ─── ANSWERED STATE ───────────────────────────────────────────────────────
  if (gameState === "answered") {
    return (
      <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center p-6 text-brand-white text-center">
        {answerResult ? (
          <>
            {answerResult.is_correct ? (
              <>
                <CheckCircle2 className="w-24 h-24 text-status-correct mb-6" />
                <h1 className="font-display text-5xl font-bold text-status-correct mb-3">Correct!</h1>
                <p className="text-brand-muted text-xl mb-8">+{answerResult.points_earned} points</p>
              </>
            ) : (
              <>
                <XCircle className="w-24 h-24 text-status-wrong mb-6" />
                <h1 className="font-display text-5xl font-bold text-status-wrong mb-3">Wrong</h1>
                <p className="text-brand-muted text-xl mb-4">The answer was <strong className="text-brand-white">{answerResult.correct_answer}</strong></p>
                <p className="text-brand-muted mb-8">+0 points</p>
              </>
            )}
            <div className="text-brand-muted font-mono text-sm uppercase tracking-widest animate-pulse">Waiting for next question...</div>
          </>
        ) : (
          <>
            <Loader2 className="w-16 h-16 text-brand-muted animate-spin mb-6" />
            <h1 className="font-display text-4xl font-bold mb-3">Time's up!</h1>
            <p className="text-brand-muted text-xl">Waiting for next question...</p>
          </>
        )}
      </div>
    );
  }

  // ─── QUESTION STATE ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-brand-black flex flex-col text-brand-white">
      {/* Timer bar */}
      <div className="w-full h-2 bg-brand-surface">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${timerColor}`}
          style={{ width: `${timerPercent}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col p-4 md:p-8 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-2">
          <div className="font-mono text-brand-lime text-sm uppercase tracking-widest">
            Q{game.current_question_index + 1} of {questions.length}
          </div>
          <div className={`font-display text-3xl font-bold tabular-nums ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : timeLeft <= 10 ? 'text-orange-400' : 'text-brand-white'}`}>
            {timeLeft}s
          </div>
        </div>

        {/* Question */}
        <div className="flex-1 flex flex-col justify-between">
          <h1 className="font-display text-2xl md:text-4xl font-bold leading-tight mb-8 text-center">
            {currentQuestion.text}
          </h1>

          {/* Answer Cards */}
          <div className="grid grid-cols-1 gap-4">
            {currentQuestion.options.map((opt: any, idx: number) => {
              const isSelected = selectedAnswer === opt.label;
              const isDisabled = !!selectedAnswer;
              return (
                <button
                  key={opt.label}
                  onClick={() => handleAnswer(opt.label)}
                  disabled={isDisabled}
                  className={`
                    w-full p-5 rounded-[2px] border-2 bg-gradient-to-r text-left flex items-center gap-4 font-semibold text-lg transition-all
                    ${isSelected ? `${ANSWER_COLORS[idx]} opacity-100 scale-[0.98]` : `${ANSWER_COLORS[idx]} opacity-${isDisabled ? '40' : '90'} hover:opacity-100 hover:scale-[0.99]`}
                    disabled:cursor-not-allowed
                  `}
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <div className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-[2px] font-mono font-bold shrink-0">
                    {opt.label}
                  </div>
                  <span className="text-white">{opt.text}</span>
                  {isSubmitting && isSelected && (
                    <Loader2 className="w-5 h-5 animate-spin ml-auto text-white/70" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Player badge */}
        <div className="mt-6 flex items-center justify-between border-t border-brand-border pt-4">
          <div className="font-mono text-brand-muted text-sm">{participant?.display_name}</div>
          {totalPoints > 0 && <div className="font-display font-bold text-brand-lime">{totalPoints} pts</div>}
        </div>
      </div>
    </div>
  );
}
