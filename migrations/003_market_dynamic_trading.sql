ALTER TABLE bets
  ADD COLUMN IF NOT EXISTS side VARCHAR(10) NOT NULL DEFAULT 'buy';

ALTER TABLE bets
  DROP CONSTRAINT IF EXISTS bets_amount_check;

ALTER TABLE bets
  ADD CONSTRAINT bets_amount_check CHECK (amount > 0);

ALTER TABLE bets
  DROP CONSTRAINT IF EXISTS bets_side_check;

ALTER TABLE bets
  ADD CONSTRAINT bets_side_check CHECK (side IN ('buy', 'sell'));

CREATE TABLE IF NOT EXISTS market_positions (
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  outcome_index INT NOT NULL,
  shares BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (market_id, user_id, outcome_index),
  CHECK (shares >= 0)
);

CREATE INDEX IF NOT EXISTS idx_market_positions_market_user
  ON market_positions(market_id, user_id);
