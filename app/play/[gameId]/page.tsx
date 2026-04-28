import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import PlayerGameClient from "./PlayerGameClient";

export default async function PlayerWaitingRoom({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const supabase = await createClient();

  // Verify participant cookie exists
  const cookieStore = await cookies();
  const participantId = cookieStore.get(`participant_${gameId}`)?.value;

  if (!participantId) {
    return (
      <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center p-6 text-brand-white text-center">
        <h1 className="font-display text-4xl font-bold mb-4">You're not in this room</h1>
        <p className="text-brand-muted mb-8">Please join the room properly to get your player assignment.</p>
        <Link href="/join" className="px-8 py-4 bg-brand-lime text-brand-black font-semibold rounded-[2px] hover:brightness-110 transition-all">Go to Join Screen</Link>
      </div>
    );
  }

  // Fetch game
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, title, mode, status, current_question_index, question_started_at, reward, time_per_question")
    .eq("id", gameId)
    .single();

  if (gameError || !game) notFound();

  // Fetch questions (options only, no correct_answer exposed)
  const { data: questions } = await supabase
    .from("questions")
    .select("id, text, options, order_index")
    .eq("game_id", gameId)
    .order("order_index", { ascending: true });

  // Fetch participant
  const { data: participant } = await supabase
    .from("participants")
    .select("id, display_name")
    .eq("id", participantId)
    .single();

  if (!participant) {
    return (
      <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center p-6 text-brand-white text-center">
        <h1 className="font-display text-4xl font-bold mb-4">Session expired</h1>
        <p className="text-brand-muted mb-8">Please re-join the game.</p>
        <Link href="/join" className="px-8 py-4 bg-brand-lime text-brand-black font-semibold rounded-[2px] hover:brightness-110 transition-all">Go to Join Screen</Link>
      </div>
    );
  }

  // Fetch participant's existing answers for this game (for score persistence)
  const { data: existingAnswers } = await supabase
    .from("answers")
    .select("question_id, points_earned")
    .eq("game_id", gameId)
    .eq("participant_id", participantId);

  const initialTotalPoints = (existingAnswers || []).reduce((sum, a) => sum + a.points_earned, 0);
  const answeredQuestionIds = (existingAnswers || []).map((a) => a.question_id);

  return (
    <PlayerGameClient
      initialGame={game}
      questions={questions || []}
      participant={participant}
      initialTotalPoints={initialTotalPoints}
      answeredQuestionIds={answeredQuestionIds}
    />
  );
}

