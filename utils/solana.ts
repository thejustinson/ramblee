import { Connection, PublicKey } from "@solana/web3.js";

// ─── Constants ────────────────────────────────────────────────────────────────
// Devnet token mints
export const USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"; // Standard devnet USDC
export const USDG_MINT = "2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH"; // Devnet USDG

export const TOKEN_MINTS: Record<string, string> = {
  USDC: USDC_MINT,
  USDG: USDG_MINT,
};

const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

export function getSolanaConnection() {
  return new Connection(RPC_URL, "confirmed");
}

// ─── Balance Check ────────────────────────────────────────────────────────────
// Safe to use in both client and server components
export async function getTokenBalance(
  walletAddress: string,
  mintAddress: string
): Promise<number> {
  if (!walletAddress) return 0;
  try {
    const connection = getSolanaConnection();
    const pubKey = new PublicKey(walletAddress);
    const mintKey = new PublicKey(mintAddress);
    const response = await connection.getParsedTokenAccountsByOwner(pubKey, {
      mint: mintKey,
    });
    if (response.value.length === 0) return 0;
    return response.value.reduce((sum, accountInfo) => {
      const amount =
        accountInfo.account.data.parsed.info.tokenAmount.uiAmount;
      return sum + (amount || 0);
    }, 0);
  } catch (err) {
    console.error(`Failed to fetch token balance for mint ${mintAddress}:`, err);
    return 0;
  }
}
