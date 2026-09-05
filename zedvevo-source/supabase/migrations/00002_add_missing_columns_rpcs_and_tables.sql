
-- ─── PAYMENTS ───────────────────────────────────────────────────────────────
ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_key    TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS subscription_id    UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS lipila_reference   TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS phone_number       TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata           JSONB;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS failure_reason     TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ DEFAULT NOW();
CREATE UNIQUE INDEX IF NOT EXISTS payments_idempotency_key_idx ON payments(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ─── USER_SUBSCRIPTIONS ─────────────────────────────────────────────────────
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS uploads_used     INTEGER DEFAULT 0;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS activated_at     TIMESTAMPTZ;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS expires_at       TIMESTAMPTZ;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS plan_type        TEXT;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS is_active        BOOLEAN DEFAULT TRUE;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS uploads_allowed  INTEGER;

-- ─── UPLOAD_PLANS ───────────────────────────────────────────────────────────
ALTER TABLE upload_plans ADD COLUMN IF NOT EXISTS validity_days    INTEGER;
ALTER TABLE upload_plans ADD COLUMN IF NOT EXISTS plan_type        TEXT;
ALTER TABLE upload_plans ADD COLUMN IF NOT EXISTS uploads_allowed  INTEGER;

-- ─── PROFILES ───────────────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username     TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url   TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio          TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role         TEXT DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username) WHERE username IS NOT NULL;

-- ─── NOMINEES ───────────────────────────────────────────────────────────────
ALTER TABLE nominees ADD COLUMN IF NOT EXISTS photo_url           TEXT;
ALTER TABLE nominees ADD COLUMN IF NOT EXISTS song_title          TEXT;
ALTER TABLE nominees ADD COLUMN IF NOT EXISTS song_url            TEXT;
ALTER TABLE nominees ADD COLUMN IF NOT EXISTS video_url           TEXT;
ALTER TABLE nominees ADD COLUMN IF NOT EXISTS total_votes         INTEGER DEFAULT 0;
ALTER TABLE nominees ADD COLUMN IF NOT EXISTS payment_id          UUID;
ALTER TABLE nominees ADD COLUMN IF NOT EXISTS is_winner           BOOLEAN DEFAULT FALSE;
ALTER TABLE nominees ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'pending';

-- ─── VOTES ──────────────────────────────────────────────────────────────────
ALTER TABLE votes ADD COLUMN IF NOT EXISTS vote_count       INTEGER DEFAULT 1;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS payment_id       UUID;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS payment_status   TEXT DEFAULT 'pending';

-- ─── HERO_BANNERS ───────────────────────────────────────────────────────────
ALTER TABLE hero_banners ADD COLUMN IF NOT EXISTS starts_at     TIMESTAMPTZ;
ALTER TABLE hero_banners ADD COLUMN IF NOT EXISTS ends_at       TIMESTAMPTZ;
ALTER TABLE hero_banners ADD COLUMN IF NOT EXISTS subtitle      TEXT;
ALTER TABLE hero_banners ADD COLUMN IF NOT EXISTS button_text   TEXT;
ALTER TABLE hero_banners ADD COLUMN IF NOT EXISTS button_url    TEXT;
ALTER TABLE hero_banners ADD COLUMN IF NOT EXISTS is_active     BOOLEAN DEFAULT TRUE;
ALTER TABLE hero_banners ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- ─── AWARDS ─────────────────────────────────────────────────────────────────
ALTER TABLE awards ADD COLUMN IF NOT EXISTS voting_open      BOOLEAN DEFAULT FALSE;
ALTER TABLE awards ADD COLUMN IF NOT EXISTS is_active        BOOLEAN DEFAULT TRUE;
ALTER TABLE awards ADD COLUMN IF NOT EXISTS voting_starts_at TIMESTAMPTZ;
ALTER TABLE awards ADD COLUMN IF NOT EXISTS voting_ends_at   TIMESTAMPTZ;

-- ─── AWARD_CATEGORIES ───────────────────────────────────────────────────────
ALTER TABLE award_categories ADD COLUMN IF NOT EXISTS grand_prize TEXT;
ALTER TABLE award_categories ADD COLUMN IF NOT EXISTS is_active   BOOLEAN DEFAULT TRUE;

-- ─── SONGS ──────────────────────────────────────────────────────────────────
ALTER TABLE songs ADD COLUMN IF NOT EXISTS is_trending BOOLEAN DEFAULT FALSE;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS like_count  INTEGER DEFAULT 0;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS play_count  INTEGER DEFAULT 0;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS status      TEXT DEFAULT 'pending';

-- ─── VIDEOS ─────────────────────────────────────────────────────────────────
ALTER TABLE videos ADD COLUMN IF NOT EXISTS is_trending BOOLEAN DEFAULT FALSE;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS like_count  INTEGER DEFAULT 0;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS view_count  INTEGER DEFAULT 0;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS status      TEXT DEFAULT 'pending';

-- ─── ARTISTS ────────────────────────────────────────────────────────────────
ALTER TABLE artists ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS play_count  INTEGER DEFAULT 0;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS cover_url   TEXT;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS genre       TEXT;

-- ─── SPONSORS ───────────────────────────────────────────────────────────────
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS is_active     BOOLEAN DEFAULT TRUE;
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS tier          TEXT DEFAULT 'bronze';
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS website_url   TEXT;
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS award_id      UUID;

-- ─── NOTIFICATIONS ──────────────────────────────────────────────────────────
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type    TEXT DEFAULT 'info';

-- ─── RPCs ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_play_count(song_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE songs SET play_count = COALESCE(play_count, 0) + 1 WHERE id = song_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_view_count(video_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE videos SET view_count = COALESCE(view_count, 0) + 1 WHERE id = video_id;
END;
$$;

-- ─── APP_SETTINGS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- ─── CONTENT_LIKES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_likes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id   UUID NOT NULL,
  content_type TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_id, content_type)
);
ALTER TABLE content_likes ENABLE ROW LEVEL SECURITY;

-- ─── USER_LIBRARY ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_library (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id   UUID NOT NULL,
  content_type TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_id, content_type)
);
ALTER TABLE user_library ENABLE ROW LEVEL SECURITY;

-- ─── RLS POLICIES (safe – drop & recreate) ────────────────────────────────
-- app_settings
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone reads settings"  ON app_settings;
  DROP POLICY IF EXISTS "Admins update settings" ON app_settings;
  DROP POLICY IF EXISTS "Admins insert settings" ON app_settings;
END $$;
CREATE POLICY "Anyone reads settings" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Admins update settings" ON app_settings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins insert settings" ON app_settings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- content_likes
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users manage own likes" ON content_likes;
  DROP POLICY IF EXISTS "Anyone reads likes"     ON content_likes;
END $$;
CREATE POLICY "Anyone reads likes"     ON content_likes FOR SELECT USING (true);
CREATE POLICY "Users manage own likes" ON content_likes
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_library
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users manage own library" ON user_library;
  DROP POLICY IF EXISTS "Anyone reads library"     ON user_library;
END $$;
CREATE POLICY "Anyone reads library"     ON user_library FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own library" ON user_library
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
