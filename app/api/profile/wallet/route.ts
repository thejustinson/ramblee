import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { createClient } from '@/utils/supabase/server';
import { processPendingPayoutsForUser } from '@/utils/reward-payouts';

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, action } = await req.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let walletValue: string | null = null;
    if (action === 'remove') {
      walletValue = null;
    } else if (walletAddress) {
      try {
        new PublicKey(walletAddress);
      } catch (err) {
        return NextResponse.json({ error: 'Invalid Solana wallet address' }, { status: 400 });
      }
      walletValue = walletAddress;
    } else {
      return NextResponse.json({ error: 'Missing walletAddress or action' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_address: walletValue })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update wallet address' }, { status: 500 });
    }

    if (walletValue) {
      await processPendingPayoutsForUser(user.id, walletValue);
    }

    return NextResponse.json({ success: true, walletAddress: walletValue });
  } catch (err: any) {
    console.error('Profile wallet update error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
