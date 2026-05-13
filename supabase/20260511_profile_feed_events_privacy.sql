-- Add feed events for profile activity and reward privacy setting
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS show_rewards_publicly BOOLEAN NOT NULL DEFAULT TRUE;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feed_event_type') THEN
        CREATE TYPE feed_event_type AS ENUM ('game_created', 'reward_pending', 'reward_claimed');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS feed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type feed_event_type NOT NULL,
  reference_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS feed_events_user_event_reference_idx
ON feed_events(user_id, event_type, reference_id);

CREATE INDEX IF NOT EXISTS feed_events_user_id_idx ON feed_events(user_id);
CREATE INDEX IF NOT EXISTS feed_events_created_at_idx ON feed_events(created_at DESC);
