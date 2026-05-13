-- Extend feed_event_type enum for profile activity (game_played, game_won).
-- Run this in the Supabase SQL Editor if feed inserts fail with:
--   invalid input value for enum feed_event_type: "game_played"
--
-- Do not wrap in DO $$ ... $$ — ALTER TYPE ... ADD VALUE must run at top level.

ALTER TYPE feed_event_type ADD VALUE IF NOT EXISTS 'game_played';
ALTER TYPE feed_event_type ADD VALUE IF NOT EXISTS 'game_won';
