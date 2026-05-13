import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { createFeedEvent, deleteFeedEvent } from '@/utils/feed-events';
import { transferSplToken } from '@/utils/solana-server';
import { getTokenBalance } from '@/utils/solana';
import { reconcileEscrowWalletAfterPayouts } from '@/utils/escrow';

const CLAIM_WINDOW_DAYS = 30;

export async function processGameRewardPayouts(supabase: any, game: any) {
  const rewardDistribution = game.reward_distribution as Array<{ position: number; percentage: number }> | null;
  const rewardAmount = Number(game.reward_amount || 0);
  const rewardToken = game.reward_token;

  if (!rewardDistribution || !rewardAmount || !rewardToken) {
    return;
  }

  await supabase.from('reward_payouts').delete().eq('game_id', game.id);

  const inserts: any[] = [];

  for (const split of rewardDistribution) {
    const winner = (await supabase
      .from('participants')
      .select('id, user_id, display_name')
      .eq('game_id', game.id)
      .order('joined_at', { ascending: true }))?.data
      ?.find((p: any) => p.id && p.position === split.position);

    const payoutAmount = parseFloat(((split.percentage / 100) * rewardAmount).toFixed(6));
    const position = split.position;

    let userId = null;
    let walletAddress = null;
    let status = 'pending_claim';
    let txSignature = null;
    let failureReason = null;

    if (winner?.user_id) {
      userId = winner.user_id;
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_address')
        .eq('id', userId)
        .single();

      walletAddress = profile?.wallet_address ?? null;
    }

    if (walletAddress) {
      try {
        txSignature = await transferSplToken(
          game.escrow_wallet_id,
          game.escrow_wallet,
          walletAddress,
          payoutAmount,
          rewardToken
        );
        status = 'completed';
      } catch (error: any) {
        status = 'failed';
        failureReason = error?.message || 'Transfer failed';
      }
    }

    inserts.push({
      game_id: game.id,
      participant_id: winner?.id ?? null,
      user_id: userId,
      wallet_address: walletAddress,
      amount: payoutAmount,
      token: rewardToken,
      position,
      status: walletAddress ? status : 'pending_claim',
      tx_signature: txSignature,
      failure_reason: failureReason,
      expires_at: walletAddress ? null : new Date(Date.now() + CLAIM_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  if (inserts.length > 0) {
    const { data: insertedPayouts } = await supabase
      .from('reward_payouts')
      .insert(inserts)
      .select('id, user_id, game_id, position, amount, token, status');

    if (insertedPayouts) {
      for (const payout of insertedPayouts) {
        if (!payout.user_id) continue;

        const referenceId = `payout-${payout.id}`;
        if (payout.status === 'completed') {
          await createFeedEvent(supabase, payout.user_id, 'reward_claimed', {
            game_id: payout.game_id,
            amount: payout.amount,
            token: payout.token,
            position: payout.position,
          }, referenceId);
        } else if (payout.status === 'pending_claim') {
          await createFeedEvent(supabase, payout.user_id, 'reward_pending', {
            game_id: payout.game_id,
            title: game.title,
            position: payout.position,
            amount: payout.amount,
            token: payout.token,
            expires_at: new Date(Date.now() + CLAIM_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString(),
          }, referenceId);
        }
      }
    }
  }

  await reconcileEscrowWalletAfterPayouts(supabase, game.id);
}

export async function processPendingPayoutsForUser(userId: string, walletAddress: string) {
  const supabase = await createClient();
  const { data: pending } = await supabase
    .from('reward_payouts')
    .select('id, user_id, game_id, amount, token')
    .eq('user_id', userId)
    .eq('status', 'pending_claim');

  if (!pending || pending.length === 0) {
    return;
  }

  for (const payout of pending) {
    try {
      const { data: game } = await supabase
        .from('games')
        .select('id, escrow_wallet, escrow_wallet_id, reward_token, return_wallet_address')
        .eq('id', payout.game_id)
        .single();

      if (!game?.escrow_wallet || !game?.escrow_wallet_id) {
        await supabase
          .from('reward_payouts')
          .update({ status: 'failed', failure_reason: 'Escrow wallet missing' })
          .eq('id', payout.id);
        continue;
      }

      const txSignature = await transferSplToken(
        game.escrow_wallet_id,
        game.escrow_wallet,
        walletAddress,
        Number(payout.amount),
        payout.token
      );

      await supabase
        .from('reward_payouts')
        .update({
          status: 'completed',
          wallet_address: walletAddress,
          tx_signature: txSignature,
          completed_at: new Date().toISOString(),
        })
        .eq('id', payout.id);

      if (payout.user_id) {
        await deleteFeedEvent(supabase, payout.user_id, 'reward_pending', `payout-${payout.id}`);
        await createFeedEvent(supabase, payout.user_id, 'reward_claimed', {
          game_id: payout.game_id,
          title: game.title,
          amount: payout.amount,
          token: payout.token,
          tx_signature: txSignature,
        }, `payout-${payout.id}`);
      }
    } catch (error: any) {
      await supabase
        .from('reward_payouts')
        .update({
          status: 'failed',
          failure_reason: error?.message || 'Transfer failed while processing pending payout',
        })
        .eq('id', payout.id);
    } finally {
      await reconcileEscrowWalletAfterPayouts(supabase, payout.game_id);
    }
  }
}

export async function expirePendingPayouts() {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: expired } = await supabase
    .from('reward_payouts')
    .update({ status: 'expired' })
    .eq('status', 'pending_claim')
    .lte('expires_at', now)
    .select('game_id');

  if (!expired || expired.length === 0) {
    return;
  }

  const gameIds = Array.from(new Set(expired.map((row: any) => row.game_id)));
  for (const gameId of gameIds) {
    await reconcileEscrowWalletAfterPayouts(supabase, gameId);
  }
}

export async function sweepEscrowForExpiredGame(gameId: string) {
  const supabase = createAdminClient();
  const { data: game } = await supabase
    .from('games')
    .select('id, reward_token, return_wallet_address')
    .eq('id', gameId)
    .single();

  if (!game?.return_wallet_address) {
    return;
  }

  const { data: escrow } = await supabase
    .from('escrow_wallets')
    .select('id, wallet_address, privy_wallet_id, status')
    .eq('assigned_game_id', gameId)
    .single();

  if (!escrow || !escrow.wallet_address || !escrow.privy_wallet_id) {
    return;
  }

  const balance = await getTokenBalance(escrow.wallet_address, game.reward_token);
  if (!balance || balance <= 0) {
    await reconcileEscrowWalletAfterPayouts(supabase, gameId);
    return;
  }

  try {
    const txSignature = await transferSplToken(
      escrow.privy_wallet_id,
      escrow.wallet_address,
      game.return_wallet_address,
      Number(balance),
      game.reward_token
    );

    await supabase
      .from('transaction_history')
      .insert({
        user_id: null,
        type: 'sweep',
        game_id: game.id,
        amount: Number(balance),
        token: game.reward_token,
        tx_id: txSignature,
        source_wallet: escrow.wallet_address,
        dest_wallet: game.return_wallet_address,
      });
  } catch (error) {
    // leave as pending_sweep for manual review
  } finally {
    await reconcileEscrowWalletAfterPayouts(supabase, gameId);
  }
}
