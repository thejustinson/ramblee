import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const TIME_LIMIT_MS = 30000; // 30 seconds per question

export async function POST(req: NextRequest) {
  try {
    const { gameId, questionId, participantId, chosenAnswer, questionStartedAt } = await req.json();

    if (!gameId || !questionId || !participantId || !chosenAnswer) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch the correct answer (server-side only, never exposed to clients)
    const { data: question, error: qError } = await supabase
      .from("questions")
      .select("correct_answer")
      .eq("id", questionId)
      .single();

    if (qError || !question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const isCorrect = chosenAnswer === question.correct_answer;
    const timeTakenMs = questionStartedAt
      ? Date.now() - new Date(questionStartedAt).getTime()
      : TIME_LIMIT_MS;

    // Speed-based scoring: 500 base + up to 500 speed bonus
    const clampedTime = Math.min(timeTakenMs, TIME_LIMIT_MS);
    const speedBonus = Math.round(500 * (1 - clampedTime / TIME_LIMIT_MS));
    const pointsEarned = isCorrect ? 500 + speedBonus : 0;

    // Insert the answer (upsert in case of double-tap)
    const { error: insertError } = await supabase.from("answers").upsert(
      {
        game_id: gameId,
        question_id: questionId,
        participant_id: participantId,
        chosen_answer: chosenAnswer,
        is_correct: isCorrect,
        time_taken_ms: clampedTime,
        points_earned: pointsEarned,
      },
      { onConflict: "question_id,participant_id" }
    );

    if (insertError) {
      console.error("Answer insert error:", insertError);
      return NextResponse.json({ error: "Failed to save answer" }, { status: 500 });
    }

    return NextResponse.json({
      is_correct: isCorrect,
      points_earned: pointsEarned,
      correct_answer: question.correct_answer,
    });
  } catch (err) {
    console.error("submitAnswer error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
