
-- Ensure unique constraint exists for weekly_trending upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'weekly_trending_week_type_cat_rank_key'
  ) THEN
    ALTER TABLE weekly_trending
      ADD CONSTRAINT weekly_trending_week_type_cat_rank_key
      UNIQUE (week_start, content_type, category, rank);
  END IF;
END$$;

-- Ensure downloads table has all needed columns
ALTER TABLE downloads
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS artist_name text;

-- Ensure winner_of_month unique on month+year
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'winner_of_month_month_year_key'
  ) THEN
    ALTER TABLE winner_of_month
      ADD CONSTRAINT winner_of_month_month_year_key
      UNIQUE (month, year);
  END IF;
END$$;

-- Ensure notifications has notification_type column
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS notification_type text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS link text,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Ensure songs/videos have download_count
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS download_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;

ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS download_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downloads_enabled boolean NOT NULL DEFAULT false;
