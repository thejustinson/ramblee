import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { transferSplToken } from "@/utils/solana-server";
import { reconcileEscrowWalletAfterPayouts } from "@/utils/escrow";
import { createFeedEvent, deleteFeedEvent } from '@/utils/feed-events';

type RewardClaimRow = {
  id: string;
  game_id: string;
  amount: number;
  token: string;
  user_id: string | null;
  participant_id: string | null;
  position: number | null;
  status: string;
  games: {
    escrow_wallet: string | null;
    escrow_wallet_id: string | null;
    reward_token: string | null;
    title: string | null;
  };
};

export async function POST(req: NextRequest) {
  try {
    const { claimId, walletType, externalAddress } = await req.json();

    if (!claimId || !walletType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (walletType === "external" && !externalAddress) {
      return NextResponse.json({ error: "External address required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch the claim record
    const { data: claimData } = await supabase
      .from("reward_claims")
      .select("*, games(escrow_wallet, escrow_wallet_id, reward_token, title)")
      .eq("id", claimId)
      .single();

    const claim = claimData as RewardClaimRow | null;

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }
    if (claim.status === "claimed") {
      return NextResponse.json({ error: "Already claimed" }, { status: 400 });
    }

    // Auth check — either authenticated user matches, or it's a guest claim (no user_id)
    if (claim.user_id && (!user || user.id !== claim.user_id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const game = claim.games;
    if (!game?.escrow_wallet || !game?.escrow_wallet_id) {
      return NextResponse.json({ error: "Game has no escrow wallet configured" }, { status: 400 });
    }

    // Resolve destination address
    let destinationAddress = externalAddress;
    if (walletType === "inapp" && user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("id", user.id)
        .single();

      if (!profile?.wallet_address) {
        return NextResponse.json(
          { error: "No in-app wallet found. Please try an external wallet." },
          { status: 400 }
        );
      }
      destinationAddress = profile.wallet_address;
    }

    if (!destinationAddress) {
      return NextResponse.json({ error: "No destination wallet resolved" }, { status: 400 });
    }

    // Mark as processing to prevent double-claims
    await supabase
      .from("reward_claims")
      .update({ status: "claimed", claim_wallet: destinationAddress })
      .eq("id", claimId);

    // Execute the on-chain transfer
    let txSignature: string;
    try {
      txSignature = await transferSplToken(
        game.escrow_wallet_id,
        game.escrow_wallet,
        destinationAddress,
        claim.amount,
        claim.token
      );
    } catch (transferErr: unknown) {
      // Revert status on failure
      await supabase
        .from("reward_claims")
        .update({ status: "failed" })
        .eq("id", claimId);
      const transferError = transferErr instanceof Error ? transferErr : new Error('Transfer failed');
      console.error("Token transfer failed:", transferErr);
      return NextResponse.json(
        { error: `Transfer failed: ${transferError.message}` },
        { status: 500 }
      );
    }

    // Confirm on-chain success — update claim record fully
    await supabase
      .from("reward_claims")
      .update({
        status: "claimed",
        claim_tx: txSignature,
        claim_wallet: destinationAddress,
        claimed_at: new Date().toISOString(),
      })
      .eq("id", claimId);

    // Record in history
    await supabase.from("transaction_history").insert({
      user_id: user?.id ?? null,
      type: "claim",
      game_id: claim.game_id,
      amount: claim.amount,
      token: claim.token,
      tx_id: txSignature,
      source_wallet: game.escrow_wallet,
      dest_wallet: destinationAddress
    });

    if (claim.user_id) {
      await deleteFeedEvent(supabase, claim.user_id, 'reward_pending', `claim-${claim.game_id}-${claim.participant_id}-${claim.position}`);
      await createFeedEvent(supabase, claim.user_id, 'reward_claimed', {
        game_id: claim.game_id,
        title: game.title,
        amount: claim.amount,
        token: claim.token,
        claim_id: claim.id,
      }, `claim-${claim.id}`);
    }

    try {
      await reconcileEscrowWalletAfterPayouts(supabase, claim.game_id);
    } catch (reconcileErr: unknown) {
      console.error("Escrow reconciliation failed after claim:", reconcileErr);
    }

    return NextResponse.json({ success: true, tx: txSignature });
  } catch (err: unknown) {
    console.error("Claim API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
