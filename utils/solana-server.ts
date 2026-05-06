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
  const platformWallet = await privy.walletApi.getWallet({ id: platformWalletId });
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
  const sourceSigned = await privy.walletApi.solana.signTransaction({
    walletId: sourceWalletId,
    transaction: tx,
  });

  // Have the PLATFORM wallet sign (it's the fee payer)
  const platformSigned = await privy.walletApi.solana.signTransaction({
    walletId: platformWalletId,
    transaction: sourceSigned.signedTransaction,
  });

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
