-- Add achievements and social_links columns to nominees
ALTER TABLE nominees
  ADD COLUMN IF NOT EXISTS achievements text,
  ADD COLUMN IF NOT EXISTS social_links text;  -- JSON string: {"facebook":"...","twitter":"...","instagram":"...","linkedin":"..."}

-- Add index for category+status lookups used on awards page
CREATE INDEX IF NOT EXISTS idx_nominees_category_status
  ON nominees(category_id, registration_status, nomination_status);