// ⚠️ SERVER-ONLY — Do NOT import this in client components or pages.
// This file uses @privy-io/server-auth which cannot run in a browser.
// Only import from API routes (app/api/**) or Server Actions.

import {
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getMint,
} from "@solana/spl-token";
import { PrivyClient } from "@privy-io/server-auth";
import { TOKEN_MINTS, getSolanaConnection } from "./solana";

/**
 * Retry wrapper for Privy API calls to handle HTTP/2 session issues
 */
async function withPrivyRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if this is an HTTP/2 session error that we should retry
      const isRetryableError = error.message?.includes('fetch failed') ||
                              error.message?.includes('session has been destroyed') ||
                              error.code === 'ERR_HTTP2_INVALID_SESSION' ||
                              error.code === 'ECONNRESET' ||
                              error.code === 'ETIMEDOUT';

      if (!isRetryableError || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.warn(`Privy API call failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Generic SPL token transfer using a platform fee-payer.
 * The source wallet only needs the tokens; the platform wallet pays for gas.
 */
export async function transferSplToken(
  sourceWalletId: string,
  sourceAddress: string,
  destinationAddress: string,
  amount: number,
  tokenSymbol: string
): Promise<string> {
  const mintAddress = TOKEN_MINTS[tokenSymbol];
  if (!mintAddress) throw new Error(`Unknown token: ${tokenSymbol}`);

  const platformWalletId = process.env.PRIVY_PLATFORM_WALLET_ID;
  if (!platformWalletId) throw new Error("PRIVY_PLATFORM_WALLET_ID not configured");

  const privy = new PrivyClient(
    process.env.PRIVY_APP_ID!,
    process.env.PRIVY_APP_SECRET!,
    {
      walletApi: {
        authorizationPrivateKey: process.env.PRIVY_AUTHORIZATION_KEY || "",
      },
    }
  );

  const connection = getSolanaConnection();
  const mintPubkey = new PublicKey(mintAddress);
  const sourcePubkey = new PublicKey(sourceAddress);
  const destinationPubkey = new PublicKey(destinationAddress);

  // Get the platform wallet's address to use as fee payer
  const platformWallet = await withPrivyRetry(
    () => privy.walletApi.getWallet({ id: platformWalletId })
  );
  const feePayer = new PublicKey(platformWallet.address);

  // Get mint decimals
  const mintInfo = await getMint(connection, mintPubkey);
  const decimals = mintInfo.decimals;
  const rawAmount = BigInt(Math.round(amount * 10 ** decimals));

  // Derive ATAs
  const sourceATA = getAssociatedTokenAddressSync(mintPubkey, sourcePubkey);
  const destinationATA = getAssociatedTokenAddressSync(mintPubkey, destinationPubkey);

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

  const tx = new Transaction();
  tx.recentBlockhash = blockhash;
  tx.feePayer = feePayer;

  // Idempotently create the destination ATA if it doesn't exist
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      feePayer,
      destinationATA,
      destinationPubkey,
      mintPubkey
    )
  );

  // The actual token transfer
  tx.add(
    createTransferCheckedInstruction(
      sourceATA,
      mintPubkey,
      destinationATA,
      sourcePubkey, // source is the authority
      rawAmount,
      decimals
    )
  );

  // Have the SOURCE wallet sign (it's the token authority)
  const sourceSigned = await withPrivyRetry(
    () => privy.walletApi.solana.signTransaction({
      walletId: sourceWalletId,
      transaction: tx,
    })
  );

  // Have the PLATFORM wallet sign (it's the fee payer)
  const platformSigned = await withPrivyRetry(
    () => privy.walletApi.solana.signTransaction({
      walletId: platformWalletId,
      transaction: sourceSigned.signedTransaction,
    })
  );

  // Serialize and broadcast the fully-signed transaction
  const signedTx = platformSigned.signedTransaction.serialize();
  const signature = await connection.sendRawTransaction(signedTx, {
    skipPreflight: false,
  });

  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed"
  );

  return signature;
}
