import { PrivyClient } from '@privy-io/server-auth';
import { createAdminClient } from '@/utils/supabase/admin';
import { getTokenBalance, USDC_MINT, USDG_MINT } from '@/utils/solana';

const PRIVY_APP_ID = process.env.PRIVY_APP_ID;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;
const PRIVY_AUTHORIZATION_KEY = process.env.PRIVY_AUTHORIZATION_KEY;

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

function getPrivyClient() {
  if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
    throw new Error('Privy credentials not configured.');
  }

  return new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET, {
    walletApi: {
      authorizationPrivateKey: PRIVY_AUTHORIZATION_KEY || '',
    },
  });
}

export async function verifyEscrowWalletEmpty(walletAddress: string) {
  if (!walletAddress) return false;
  const usdcBalance = await getTokenBalance(walletAddress, USDC_MINT);
  const usdgBalance = await getTokenBalance(walletAddress, USDG_MINT);
  return usdcBalance === 0 && usdgBalance === 0;
}

export async function provisionEscrowWallet() {
  const privy = getPrivyClient();
  const { address, id } = await withPrivyRetry(
    () => privy.walletApi.create({ chainType: 'solana' })
  );
  if (!address || !id) {
    throw new Error('Failed to provision new Privy escrow wallet.');
  }
  return { address, walletId: id };
}

export async function assignEscrowWalletToGame(supabase: any, gameId: string) {
  const adminSupabase = createAdminClient();

  // Attempt to find the first available zero-balance wallet.
  const { data: candidates, error: selectError } = await adminSupabase
    .from('escrow_wallets')
    .select('*')
    .eq('status', 'available')
    .order('created_at', { ascending: true })
    .limit(10);

  if (selectError) {
    throw new Error('Failed to query escrow wallet pool.');
  }

  if (candidates && candidates.length > 0) {
    for (const wallet of candidates) {
      const empty = await verifyEscrowWalletEmpty(wallet.wallet_address);
      if (!empty) {
        await adminSupabase
          .from('escrow_wallets')
          .update({ status: 'pending_sweep', last_used_at: new Date().toISOString() })
          .eq('id', wallet.id);
        continue;
      }

      const { data: updated, error: updateError } = await adminSupabase
        .from('escrow_wallets')
        .update({
          status: 'assigned',
          assigned_game_id: gameId,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', wallet.id)
        .eq('status', 'available')
        .select()
        .single();

      if (!updateError && updated) {
        return updated;
      }
    }
  }

  // Fallback: provision a new wallet if no available pool entry can be used.
  const { address, walletId } = await provisionEscrowWallet();

  if (!address || !walletId) {
    throw new Error('Provisioned escrow wallet did not return a valid address or wallet id.');
  }

  const { data: newWallet, error: insertError } = await adminSupabase
    .from('escrow_wallets')
    .insert({
      wallet_address: address,
      privy_wallet_id: walletId,
      status: 'assigned',
      assigned_game_id: gameId,
      last_used_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError || !newWallet) {
    console.error('Escrow wallet insert error:', insertError);
    throw new Error(
      `Failed to insert new escrow wallet into pool: ${insertError?.message ?? 'unknown error'}`
    );
  }

  return newWallet;
}

export async function reconcileEscrowWalletAfterPayouts(supabase: any, gameId: string) {
  const adminSupabase = createAdminClient();
  const { data: escrow, error: escrowError } = await adminSupabase
    .from('escrow_wallets')
    .select('*')
    .eq('assigned_game_id', gameId)
    .single();

  if (escrowError || !escrow) {
    return;
  }

  const [{ data: pendingPayouts }, { data: pendingClaims }] = await Promise.all([
    supabase
      .from('reward_payouts')
      .select('id')
      .eq('game_id', gameId)
      .in('status', ['pending_claim', 'pending_retry']),
    supabase
      .from('reward_claims')
      .select('id')
      .eq('game_id', gameId)
      .eq('status', 'unclaimed'),
  ]);

  if ((pendingPayouts && pendingPayouts.length > 0) || (pendingClaims && pendingClaims.length > 0)) {
    return; // keep wallet assigned while claims are outstanding
  }

  const [usdcBalance, usdgBalance] = await Promise.all([
    getTokenBalance(escrow.wallet_address, USDC_MINT),
    getTokenBalance(escrow.wallet_address, USDG_MINT),
  ]);

  const balance = Math.max(usdcBalance, usdgBalance);

  if (balance === 0) {
    await adminSupabase
      .from('escrow_wallets')
      .update({ status: 'available', assigned_game_id: null, last_used_at: new Date().toISOString() })
      .eq('id', escrow.id);
  } else {
    await adminSupabase
      .from('escrow_wallets')
      .update({ status: 'pending_sweep', last_used_at: new Date().toISOString() })
      .eq('id', escrow.id);
  }
}
