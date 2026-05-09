import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { expirePendingPayouts, sweepEscrowForExpiredGame } from '@/utils/reward-payouts';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    await expirePendingPayouts();
    const { data: finishedGames } = await supabase
      .from('games')
      .select('id')
      .not('status', 'eq', 'active')
      .not('status', 'eq', 'funding')
      .not('status', 'eq', 'draft')
      .not('status', 'eq', 'finished');

    if (finishedGames) {
      for (const game of finishedGames) {
        await sweepEscrowForExpiredGame(game.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Expire payout cron error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
