
-- ============================================================
-- 1. Add download_count + downloads_enabled to songs & videos
-- ============================================================
ALTER TABLE songs ADD COLUMN IF NOT EXISTS download_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS share_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS download_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS downloads_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS share_count INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- 2. Downloads table
-- ============================================================
CREATE TABLE IF NOT EXISTS downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('song','video')),
  file_url TEXT NOT NULL,
  title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  cover_url TEXT,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_content ON downloads(content_id, content_type);

-- ============================================================
-- 3. Weekly trending snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS weekly_trending (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('song','video')),
  rank INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('most_played','most_downloaded','most_viewed','most_liked','most_shared')),
  metric_value INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  cover_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_trending_unique ON weekly_trending(week_start, content_type, category, rank);
CREATE INDEX IF NOT EXISTS idx_weekly_trending_week ON weekly_trending(week_start DESC);

-- ============================================================
-- 4. Winner of the month
-- ============================================================
CREATE TABLE IF NOT EXISTS winner_of_month (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  artist_name TEXT NOT NULL,
  award_category TEXT,
  photo_url TEXT,
  prize TEXT,
  description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(month, year)
);

-- ============================================================
-- 5. Add award_season to awards table + nomination_status
-- ============================================================
ALTER TABLE awards ADD COLUMN IF NOT EXISTS season_label TEXT;
ALTER TABLE nominees ADD COLUMN IF NOT EXISTS nomination_status TEXT NOT NULL DEFAULT 'pending_payment'
  CHECK (nomination_status IN ('pending_payment','pending_review','approved','rejected','winner'));

-- ============================================================
-- 6. RPC: increment_download_count for songs
-- ============================================================
CREATE OR REPLACE FUNCTION increment_song_download(song_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE songs SET download_count = download_count + 1 WHERE id = song_id;
END;
$$;

-- ============================================================
-- 7. RPC: increment_download_count for videos
-- ============================================================
CREATE OR REPLACE FUNCTION increment_video_download(video_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE videos SET download_count = download_count + 1 WHERE id = video_id;
END;
$$;

-- ============================================================
-- 8. RLS for downloads
-- ============================================================
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own downloads" ON downloads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own downloads" ON downloads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 9. RLS for weekly_trending (public read)
-- ============================================================
ALTER TABLE weekly_trending ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read weekly_trending" ON weekly_trending FOR SELECT USING (true);

-- ============================================================
-- 10. RLS for winner_of_month (public read published)
-- ============================================================
ALTER TABLE winner_of_month ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published winners" ON winner_of_month FOR SELECT USING (is_published = true);
CREATE POLICY "Admin manage winners" ON winner_of_month
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 11. Notifications: add link and notification_type columns
-- ============================================================
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_type TEXT NOT NULL DEFAULT 'general';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Ensure global notifications policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can delete own notifications'
  ) THEN
    CREATE POLICY "Users can delete own notifications" ON notifications
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Mark own notifications read'
  ) THEN
    CREATE POLICY "Mark own notifications read" ON notifications
      FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
  END IF;
END $$;

-- ============================================================
-- 12. Sponsors: ensure RLS insert policy for admin
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sponsors' AND policyname = 'Admin manage sponsors'
  ) THEN
    CREATE POLICY "Admin manage sponsors" ON sponsors
      FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;
