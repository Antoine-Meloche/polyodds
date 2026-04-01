-- Seed existing markets with baseline liquidity if they were created before
-- initial per-outcome liquidity was introduced.
UPDATE markets
SET pools = (
  SELECT array_agg(v + 500)
  FROM unnest(markets.pools) AS v
)
WHERE COALESCE((SELECT SUM(v) FROM unnest(markets.pools) AS v), 0) = 0;
