import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { enabled } = await req.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('profiles')
      .update({ show_rewards_publicly: enabled })
      .eq('id', user.id);

    if (error) {
      console.error('Failed to update reward privacy setting:', error);
      return NextResponse.json({ error: 'Failed to update privacy setting' }, { status: 500 });
    }

    return NextResponse.json({ success: true, enabled });
  } catch (err: unknown) {
    console.error('Reward privacy API error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || 'Internal server error' }, { status: 500 });
  }
}
