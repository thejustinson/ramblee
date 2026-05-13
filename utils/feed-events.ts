import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export type FeedEventType =
  | 'game_created'
  | 'game_played'
  | 'game_won'
  | 'reward_pending'
  | 'reward_claimed';

export type ProfileFeedEvent = {
  id: string;
  event_type: FeedEventType;
  reference_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export async function createFeedEvent(
  supabase: SupabaseClient,
  userId: string,
  eventType: FeedEventType,
  metadata: Record<string, unknown>,
  referenceId: string | null = null
) {
  if (!userId) return;

  // Use service role on the server so RLS can't block inserts.
  // Fall back to the provided client if service role isn't configured.
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;

  const { error } = await db.from('feed_events').upsert(
    {
      user_id: userId,
      event_type: eventType,
      reference_id: referenceId,
      metadata,
    },
    {
      onConflict: 'user_id, event_type, reference_id',
      ignoreDuplicates: true,
    }
  );

  if (error) {
    console.error('Failed to create feed event:', {
      userId,
      eventType,
      referenceId,
      error,
    });
  }
}

export async function getProfileFeedEvents(
  userId: string,
  isOwnProfile: boolean,
  showRewardsPublicly: boolean
): Promise<ProfileFeedEvent[]> {
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
  let query = supabase
    .from('feed_events')
    .select('id, event_type, reference_id, metadata, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!isOwnProfile) {
    query = query.not('event_type', 'eq', 'reward_pending');
    if (!showRewardsPublicly) {
      query = query.not('event_type', 'eq', 'reward_claimed');
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error('Failed to load profile feed events:', error);
    return [];
  }

  return (data as ProfileFeedEvent[]) ?? [];
}

export async function deleteFeedEvent(
  supabase: SupabaseClient,
  userId: string,
  eventType: FeedEventType,
  referenceId: string
) {
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;

  const { error } = await db
    .from('feed_events')
    .delete()
    .eq('user_id', userId)
    .eq('event_type', eventType)
    .eq('reference_id', referenceId);

  if (error) {
    console.error('Failed to delete feed event:', {
      userId,
      eventType,
      referenceId,
      error,
    });
  }
}

export async function getProfileFeedStats(userId: string, isOwnProfile: boolean): Promise<Array<{ label: string; value: string }>> {
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  const [{ count: gamesCreatedCount }, { count: gamesPlayedCount }, { count: rewardsClaimedCount }] = await Promise.all([
    supabase.from('games').select('id', { count: 'exact', head: true }).eq('organiser_id', userId),
    supabase.from('participants').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase
      .from('feed_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('event_type', 'reward_claimed'),
  ]);

  const stats = [
    {
      label: 'Games Created',
      value: String(gamesCreatedCount ?? 0),
    },
    {
      label: 'Games Played',
      value: String(gamesPlayedCount ?? 0),
    },
    {
      label: 'Rewards Claimed',
      value: String(rewardsClaimedCount ?? 0),
    },
  ];

  if (isOwnProfile) {
    const { count: pendingCount } = await supabase
      .from('reward_payouts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'pending_claim');

    stats.push({
      label: 'Pending Rewards',
      value: String(pendingCount ?? 0),
    });
  }

  return stats;
}
