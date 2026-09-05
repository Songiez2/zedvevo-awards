
-- Add featured_artists and producer to videos
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS featured_artists text,
  ADD COLUMN IF NOT EXISTS producer text;

-- Add thumbnail_url to songs (for share card)
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Ensure videos.thumbnail_url exists (may already exist)
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS thumbnail_url text;
