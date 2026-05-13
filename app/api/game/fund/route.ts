import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getTokenBalance, TOKEN_MINTS } from '@/utils/solana';

export async function POST(req: NextRequest) {
  try {
    const { gameId } = await req.json();
    console.log('api/game/fund request body:', { gameId });
    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    console.log('api/game/fund auth result:', { userId: user?.id, authError });
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: game, error } = await supabase
      .from('games')
      .select('id, organiser_id, escrow_wallet, reward_amount, reward_token, status')
      .eq('id', gameId)
      .single();
    console.log('api/game/fund game fetch:', { game, error });

    if (error || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.organiser_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (game.status !== 'funding') {
      if (game.status === 'funded') {
        const mintAddress = TOKEN_MINTS[game.reward_token];
        const balance = game.escrow_wallet && mintAddress ? await getTokenBalance(game.escrow_wallet, mintAddress) : 0;
        return NextResponse.json({ success: true, funded: true, balance });
      }

      return NextResponse.json({ error: 'Game is not awaiting funding' }, { status: 400 });
    }

    if (!game.escrow_wallet || !game.reward_amount || !game.reward_token) {
      return NextResponse.json({ error: 'Escrow or reward configuration missing' }, { status: 400 });
    }

    const mintAddress = TOKEN_MINTS[game.reward_token];
    if (!mintAddress) {
      return NextResponse.json({ error: 'Unsupported reward token' }, { status: 400 });
    }

    const balance = await getTokenBalance(game.escrow_wallet, mintAddress);
    if (balance < Number(game.reward_amount)) {
      return NextResponse.json({ funded: false, balance, required: Number(game.reward_amount) });
    }

    const { data: updatedGame, error: updateError } = await supabase
      .from('games')
      .update({ status: 'funded' })
      .eq('id', gameId)
      .select()
      .single();
    console.log('api/game/fund game update:', { updatedGame, updateError });

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update game status', detail: updateError.message }, { status: 500 });
    }

    const { data: txData, error: txError } = await supabase.from('transaction_history').insert({
      user_id: user.id,
      type: 'deposit',
      game_id: gameId,
      amount: Number(game.reward_amount),
      token: game.reward_token,
      source_wallet: 'External',
      dest_wallet: game.escrow_wallet,
    }).select().single();
    console.log('api/game/fund transaction insert:', { txData, txError });

    if (txError) {
      return NextResponse.json({ error: 'Failed to log funding transaction', detail: txError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, funded: true, balance });
  } catch (err: any) {
    console.error('Funding confirmation error:', err?.message ?? err, err?.stack ?? 'no stack');
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
