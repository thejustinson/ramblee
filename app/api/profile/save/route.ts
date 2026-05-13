import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { createClient } from "@/utils/supabase/server";
import { normalizeAvatarUrl } from "@/utils/avatar";
import { processPendingPayoutsForUser } from "@/utils/reward-payouts";

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

function isValidSolanaAddress(s: string): boolean {
  const t = s.trim();
  if (t.length < 32 || t.length > 44) return false;
  try {
    new PublicKey(t);
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const display_name = typeof body.display_name === "string" ? body.display_name.trim() : "";
    const handle = typeof body.handle === "string" ? body.handle.trim().toLowerCase() : "";
    const walletRaw = body.wallet_address;
    const wallet_address =
      walletRaw === null || walletRaw === undefined || String(walletRaw).trim() === ""
        ? null
        : String(walletRaw).trim();
    const show_rewards_publicly = Boolean(body.show_rewards_publicly);
    const avatar_url_raw = body.avatar_url;
    const avatar_url =
      avatar_url_raw === null || avatar_url_raw === undefined || String(avatar_url_raw).trim() === ""
        ? null
        : normalizeAvatarUrl(String(avatar_url_raw).trim());

    if (!display_name || display_name.length > 40) {
      return NextResponse.json({ error: "Display name must be 1–40 characters" }, { status: 400 });
    }

    if (!HANDLE_RE.test(handle)) {
      return NextResponse.json(
        { error: "Handle must be 3–20 characters: lowercase letters, numbers, underscores only" },
        { status: 400 }
      );
    }

    if (wallet_address && !isValidSolanaAddress(wallet_address)) {
      return NextResponse.json({ error: "Invalid Solana wallet address" }, { status: 400 });
    }

    const { data: existing } = await supabase.from("profiles").select("handle, wallet_address").eq("id", user.id).single();

    if (!existing) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (handle !== existing.handle) {
      const { data: taken } = await supabase.from("profiles").select("id").eq("handle", handle).maybeSingle();
      if (taken) {
        return NextResponse.json({ error: "That handle is already taken" }, { status: 409 });
      }
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name,
        handle,
        wallet_address,
        show_rewards_publicly,
        avatar_url,
      })
      .eq("id", user.id);

    if (updateError) {
      if (updateError.code === "23505") {
        return NextResponse.json({ error: "That handle is already taken" }, { status: 409 });
      }
      console.error("profile save error:", updateError);
      return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
    }

    if (wallet_address && wallet_address !== existing.wallet_address) {
      try {
        await processPendingPayoutsForUser(user.id, wallet_address);
      } catch (e) {
        console.error("processPendingPayoutsForUser after save:", e);
      }
    }

    return NextResponse.json({
      success: true,
      handle,
      display_name,
      wallet_address,
      show_rewards_publicly,
      avatar_url: avatar_url ?? undefined,
    });
  } catch (err: unknown) {
    console.error("profile save route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
