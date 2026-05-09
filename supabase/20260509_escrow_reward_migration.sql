-- Add external wallet address for player profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS wallet_address TEXT;

-- Add optional return address for organiser refunds after claim expiry
ALTER TABLE games
ADD COLUMN IF NOT EXISTS return_wallet_address TEXT;

-- Escrow pool for reusable server-side wallets
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'escrow_wallet_status') THEN
        CREATE TYPE escrow_wallet_status AS ENUM ('available', 'assigned', 'pending_sweep');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS escrow_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  privy_wallet_id TEXT NOT NULL UNIQUE,
  status escrow_wallet_status NOT NULL DEFAULT 'available',
  assigned_game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS escrow_wallets_status_idx ON escrow_wallets(status);
CREATE INDEX IF NOT EXISTS escrow_wallets_assigned_game_id_idx ON escrow_wallets(assigned_game_id);

-- Reward payout ledger for escrow disbursements
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reward_payout_status') THEN
        CREATE TYPE reward_payout_status AS ENUM ('pending', 'pending_claim', 'completed', 'failed', 'expired');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS reward_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  wallet_address TEXT,
  amount NUMERIC(18,6) NOT NULL,
  token TEXT NOT NULL,
  status reward_payout_status NOT NULL DEFAULT 'pending_claim',
  position INT NOT NULL,
  tx_signature TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS reward_payouts_game_id_idx ON reward_payouts(game_id);
CREATE INDEX IF NOT EXISTS reward_payouts_user_id_idx ON reward_payouts(user_id);
CREATE INDEX IF NOT EXISTS reward_payouts_status_idx ON reward_payouts(status);
