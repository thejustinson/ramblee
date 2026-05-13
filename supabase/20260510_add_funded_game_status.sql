-- Add the intermediate 'funded' status to the games status check constraint
ALTER TABLE games
DROP CONSTRAINT IF EXISTS games_status_check;

ALTER TABLE games
ADD CONSTRAINT games_status_check CHECK (
  status IN ('draft', 'funding', 'funded', 'active', 'finished')
);
