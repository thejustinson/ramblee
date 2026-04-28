import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import ControlRoomClient from "./ControlRoomClient";

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

  // Fetch initial participant count
  const { count } = await supabase
    .from("participants")
    .select("*", { count: "exact", head: true })
    .eq("game_id", game.id);

  return (
    <ControlRoomClient 
      game={game} 
      questions={questions || []} 
      initialParticipantCount={count || 0} 
    />
  );
}
