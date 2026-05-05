import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { gameId } = await req.json();

    if (!gameId) {
      return NextResponse.json({ error: "Missing gameId" }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Verify organiser
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("*")
      .eq("id", gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    if (game.organiser_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (game.is_revealing) {
      return NextResponse.json({ error: "Already revealing" }, { status: 400 });
    }

    // 2. Fetch current question and its correct answer
    const { data: questions, error: qError } = await supabase
      .from("questions")
      .select("id, correct_answer, order_index")
      .eq("game_id", gameId)
      .order("order_index", { ascending: true });

    if (qError || !questions) {
      return NextResponse.json({ error: "Questions not found" }, { status: 404 });
    }

    const currentIdx = game.current_question_index;
    const currentQuestion = questions[currentIdx];

    if (!currentQuestion) {
      return NextResponse.json({ error: "Current question not found" }, { status: 404 });
    }

    // 3. PHASE 1: REVEAL
    // Update game to revealing state
    const { error: revealError } = await supabase
      .from("games")
      .update({
        is_revealing: true,
        reveal_answer: currentQuestion.correct_answer
      })
      .eq("id", gameId);

    if (revealError) {
      console.error("Reveal update error:", revealError);
      return NextResponse.json({ error: "Failed to reveal answer" }, { status: 500 });
    }

    // 4. WAIT 2 SECONDS
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 5. PHASE 2: ADVANCE
    const nextIdx = currentIdx + 1;
    const isFinished = nextIdx >= questions.length;

    const updateData: any = {
      is_revealing: false,
      reveal_answer: null,
    };

    if (isFinished) {
      updateData.status = "finished";
    } else {
      updateData.current_question_index = nextIdx;
      updateData.question_started_at = new Date().toISOString();
    }

    const { error: advanceError } = await supabase
      .from("games")
      .update(updateData)
      .eq("id", gameId);

    if (advanceError) {
      console.error("Advance update error:", advanceError);
      return NextResponse.json({ error: "Failed to advance game" }, { status: 500 });
    }

    return NextResponse.json({ success: true, finished: isFinished });
  } catch (err) {
    console.error("Reveal API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
