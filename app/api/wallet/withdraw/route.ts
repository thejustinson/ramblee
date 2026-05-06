import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { PrivyClient } from "@privy-io/server-auth";
import { transferSplToken } from "@/utils/solana-server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { token, amount, recipient } = body;

    if (!token || !amount || !recipient) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Fetch user's wallet address from Supabase
    const { data: profile } = await supabase
      .from("profiles")
      .select("wallet_address")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.wallet_address) {
      return NextResponse.json({ error: "No wallet found for user" }, { status: 404 });
    }

    // 2. Initialize Privy Client to find the Wallet ID
    const privy = new PrivyClient(
      process.env.PRIVY_APP_ID!,
      process.env.PRIVY_APP_SECRET!,
      {
        walletApi: {
          authorizationPrivateKey: process.env.PRIVY_AUTHORIZATION_KEY || ""
        }
      }
    );

    // 3. Find the Server Wallet ID for this address
    // In a high-traffic app, we should store wallet_id in our DB to avoid this API call
    const { data: wallets } = await privy.walletApi.getWallets();
    const serverWallet = wallets.find(w => w.address === profile.wallet_address && w.chainType === 'solana');

    if (!serverWallet) {
      return NextResponse.json({ error: "Custodial wallet not found in Privy" }, { status: 404 });
    }

    // 4. Execute the on-chain transfer
    const signature = await transferSplToken(
      serverWallet.id,
      profile.wallet_address,
      recipient,
      parseFloat(amount),
      token
    );

    // 5. Record in history
    await supabase.from("transaction_history").insert({
      user_id: user.id,
      type: "withdrawal",
      amount: parseFloat(amount),
      token: token,
      tx_id: signature,
      source_wallet: profile.wallet_address,
      dest_wallet: recipient
    });

    return NextResponse.json({ 
      success: true, 
      signature,
      message: `Successfully transferred ${amount} ${token} to ${recipient}`
    });

  } catch (err: any) {
    console.error("Withdrawal error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
