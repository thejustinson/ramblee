import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import FundingClient from "./FundingClient";

export default async function FundingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: game } = await supabase
    .from("games")
    .select("id, title, mode, status, organiser_id, escrow_wallet, reward_amount, reward_token, reward_distribution")
    .eq("id", id)
    .single();

  if (!game) notFound();
  if (game.organiser_id !== user.id) redirect(`/dashboard/game/${id}`);

  // If already funded/active, skip straight to control room
  if (game.status !== "funding") redirect(`/dashboard/game/${id}`);

  if (!game.escrow_wallet) notFound();

  return (
    <FundingClient
      gameId={game.id}
      gameTitle={game.title}
      escrowWallet={game.escrow_wallet}
      rewardAmount={game.reward_amount ?? 0}
      rewardToken={game.reward_token ?? "USDC"}
      rewardDistribution={game.reward_distribution}
    />
  );
}
