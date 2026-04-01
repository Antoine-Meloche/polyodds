ALTER TABLE markets
  ALTER COLUMN category_id DROP NOT NULL,
  ALTER COLUMN creator_id DROP NOT NULL;

ALTER TABLE markets
  DROP CONSTRAINT IF EXISTS markets_category_ids_check;

ALTER TABLE markets
  DROP CONSTRAINT IF EXISTS markets_creator_id_fkey;

ALTER TABLE markets
  ADD CONSTRAINT markets_creator_id_fkey
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL;