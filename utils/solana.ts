import { Connection, PublicKey } from "@solana/web3.js";

// Constants
// We are using devnet USDC and USDG mints for testing
export const USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"; // Standard devnet USDC
export const USDG_MINT = "2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH"; // Placeholder devnet USDG
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

export async function getTokenBalance(walletAddress: string, mintAddress: string): Promise<number> {
  if (!walletAddress) return 0;
  
  try {
    const connection = new Connection(RPC_URL);
    const pubKey = new PublicKey(walletAddress);
    const mintKey = new PublicKey(mintAddress);
    
    const response = await connection.getParsedTokenAccountsByOwner(pubKey, { mint: mintKey });
    
    if (response.value.length === 0) return 0;
    
    // There might be multiple accounts for the same mint, though usually just one associated token account
    const totalBalance = response.value.reduce((sum, accountInfo) => {
      const amount = accountInfo.account.data.parsed.info.tokenAmount.uiAmount;
      return sum + (amount || 0);
    }, 0);
    
    return totalBalance;
  } catch (err) {
    console.error(`Failed to fetch token balance for mint ${mintAddress}:`, err);
    return 0;
  }
}
