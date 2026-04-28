import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import ProjectionClient from "../ProjectionClient";

export default async function ProjectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Any authenticated user with the game ID can view the projection
  const { data: game, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !game) {
    notFound();
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("game_id", id)
    .order("order_index", { ascending: true });

  // Build initial leaderboard
  const { data: answers } = await supabase
    .from("answers")
    .select("participant_id, points_earned, participants(display_name)")
    .eq("game_id", id);

  const scoreMap: Record<string, { participant_id: string; display_name: string; total_points: number }> = {};
  for (const row of answers || []) {
    const pid = row.participant_id;
    const name = (row.participants as any)?.display_name || "Unknown";
    if (!scoreMap[pid]) scoreMap[pid] = { participant_id: pid, display_name: name, total_points: 0 };
    scoreMap[pid].total_points += row.points_earned;
  }
  const initialLeaderboard = Object.values(scoreMap).sort((a, b) => b.total_points - a.total_points);

  return (
    <ProjectionClient
      initialGame={game}
      questions={questions || []}
      initialLeaderboard={initialLeaderboard}
    />
  );
}
