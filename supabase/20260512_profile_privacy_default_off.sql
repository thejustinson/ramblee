-- Default reward visibility to private for new profiles
ALTER TABLE profiles
ALTER COLUMN show_rewards_publicly SET DEFAULT FALSE;
