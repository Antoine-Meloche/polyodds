ALTER TABLE markets
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE markets
  DROP CONSTRAINT IF EXISTS markets_status_check;

UPDATE markets
SET status = CASE
  WHEN status = 'ouvert' THEN 'open'
  WHEN status = 'fermé' THEN 'resolved'
  ELSE status
END;

ALTER TABLE markets
  ADD CONSTRAINT markets_status_check CHECK (status IN ('open', 'resolved'));

ALTER TABLE markets
  ALTER COLUMN status SET DEFAULT 'open';
