ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS featured_artists text,
  ADD COLUMN IF NOT EXISTS producer text;