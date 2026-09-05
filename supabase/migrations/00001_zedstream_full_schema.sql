
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================
-- ENUMS
-- ======================
CREATE TYPE public.user_role AS ENUM ('user', 'admin');
CREATE TYPE public.content_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.payment_status AS ENUM ('pending', 'successful', 'failed', 'cancelled', 'insufficient_funds', 'invalid_transaction');
CREATE TYPE public.payment_method AS ENUM ('mobile_money', 'card');
CREATE TYPE public.plan_type AS ENUM ('k10_single', 'k100_weekly', 'k300_yearly');

-- ======================
-- PROFILES
-- ======================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  phone text,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  bio text,
  role public.user_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ======================
-- APP SETTINGS
-- ======================
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default settings/prices
INSERT INTO public.app_settings (key, value, description) VALUES
  ('plan_k10_price', '10', 'Price for K10 single upload plan (ZMW)'),
  ('plan_k100_price', '100', 'Price for K100 weekly unlimited plan (ZMW)'),
  ('plan_k300_price', '300', 'Price for K300 yearly unlimited plan (ZMW)'),
  ('nominee_fee', '25', 'Nominee registration fee (ZMW)'),
  ('vote_min_amount', '5', 'Minimum voting amount (ZMW)'),
  ('site_name', 'ZedStream', 'Platform name'),
  ('site_tagline', 'Zambia''s Premier Music & Video Platform', 'Platform tagline');

-- ======================
-- UPLOAD PLANS
-- ======================
CREATE TABLE public.upload_plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  plan_type public.plan_type NOT NULL UNIQUE,
  price numeric(10,2) NOT NULL,
  description text,
  uploads_allowed integer, -- NULL means unlimited
  validity_days integer, -- NULL means no expiry
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.upload_plans (name, plan_type, price, description, uploads_allowed, validity_days) VALUES
  ('Basic Upload', 'k10_single', 10, 'Upload 1 song', 1, NULL),
  ('Weekly Unlimited', 'k100_weekly', 100, 'Unlimited uploads for 7 days', NULL, 7),
  ('Yearly Unlimited', 'k300_yearly', 300, 'Unlimited uploads for 1 year', NULL, 365);

-- ======================
-- USER UPLOAD SUBSCRIPTIONS
-- ======================
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.upload_plans(id),
  plan_type public.plan_type NOT NULL,
  uploads_used integer NOT NULL DEFAULT 0,
  uploads_allowed integer,
  activated_at timestamptz,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ======================
-- PAYMENTS
-- ======================
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  payment_method public.payment_method NOT NULL,
  lipila_transaction_id text UNIQUE,
  lipila_reference text,
  plan_id uuid REFERENCES public.upload_plans(id),
  subscription_id uuid REFERENCES public.user_subscriptions(id),
  payment_type text NOT NULL DEFAULT 'plan', -- 'plan', 'nominee_registration', 'vote'
  status public.payment_status NOT NULL DEFAULT 'pending',
  failure_reason text,
  phone_number text, -- for mobile money
  metadata jsonb DEFAULT '{}',
  idempotency_key text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ======================
-- ARTISTS
-- ======================
CREATE TABLE public.artists (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id),
  name text NOT NULL,
  bio text,
  avatar_url text,
  cover_url text,
  genre text,
  is_featured boolean NOT NULL DEFAULT false,
  play_count bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ======================
-- SONGS
-- ======================
CREATE TABLE public.songs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_id uuid REFERENCES public.artists(id),
  title text NOT NULL,
  artist_name text NOT NULL,
  album text,
  genre text,
  cover_url text,
  file_url text NOT NULL,
  duration integer, -- seconds
  play_count bigint NOT NULL DEFAULT 0,
  like_count bigint NOT NULL DEFAULT 0,
  status public.content_status NOT NULL DEFAULT 'pending',
  is_trending boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ======================
-- VIDEOS
-- ======================
CREATE TABLE public.videos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_id uuid REFERENCES public.artists(id),
  title text NOT NULL,
  artist_name text NOT NULL,
  description text,
  genre text,
  thumbnail_url text,
  file_url text NOT NULL,
  duration integer, -- seconds
  view_count bigint NOT NULL DEFAULT 0,
  like_count bigint NOT NULL DEFAULT 0,
  status public.content_status NOT NULL DEFAULT 'pending',
  is_trending boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ======================
-- SONG/VIDEO LIKES (junction)
-- ======================
CREATE TABLE public.content_likes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_id uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('song', 'video')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, content_id, content_type)
);

-- ======================
-- USER LIBRARY (saved content)
-- ======================
CREATE TABLE public.user_library (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_id uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('song', 'video')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, content_id, content_type)
);

-- ======================
-- AWARDS
-- ======================
CREATE TABLE public.awards (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now())::integer,
  is_active boolean NOT NULL DEFAULT true,
  voting_open boolean NOT NULL DEFAULT false,
  voting_starts_at timestamptz,
  voting_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.award_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  award_id uuid NOT NULL REFERENCES public.awards(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  grand_prize text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ======================
-- NOMINEES
-- ======================
CREATE TABLE public.nominees (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.award_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  bio text,
  photo_url text,
  song_title text,
  song_url text,
  video_url text,
  total_votes integer NOT NULL DEFAULT 0,
  payment_id uuid REFERENCES public.payments(id),
  registration_status public.payment_status NOT NULL DEFAULT 'pending',
  is_winner boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id)
);

-- ======================
-- VOTES
-- ======================
CREATE TABLE public.votes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nominee_id uuid NOT NULL REFERENCES public.nominees(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.award_categories(id),
  amount numeric(10,2) NOT NULL,
  vote_count integer NOT NULL DEFAULT 0,
  payment_id uuid REFERENCES public.payments(id),
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ======================
-- SPONSORS
-- ======================
CREATE TABLE public.sponsors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  award_id uuid REFERENCES public.awards(id),
  name text NOT NULL,
  logo_url text,
  website_url text,
  tier text DEFAULT 'gold', -- gold, silver, bronze
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ======================
-- HERO BANNERS
-- ======================
CREATE TABLE public.hero_banners (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_url text NOT NULL,
  title text NOT NULL,
  subtitle text,
  button_text text,
  button_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed hero banners
INSERT INTO public.hero_banners (image_url, title, subtitle, button_text, button_url, is_active, display_order) VALUES
  ('https://miaoda-site-img.s3cdn.medo.dev/images/KLing_09c34a19-b82f-4e30-a730-bbcac2c0ec23.jpg', 'TRENDING NOW', 'Discover Zambia''s hottest music', 'Listen Now', '/music', true, 1),
  ('https://miaoda-site-img.s3cdn.medo.dev/images/KLing_b80f9401-4c39-4808-a3e0-6bb4e0f4bcf3.jpg', 'ZEDSTREAM AWARDS', 'Vote for your favourite nominees', 'Vote Now', '/awards', true, 2),
  ('https://miaoda-site-img.s3cdn.medo.dev/images/KLing_c74cc378-5023-41a7-a007-d1a802291a27.jpg', 'NEW MUSIC', 'Discover new artists and releases', 'Explore', '/music', true, 3),
  ('https://miaoda-site-img.s3cdn.medo.dev/images/KLing_8a54c05e-e373-44a1-9178-cc307bfdfe53.jpg', 'WATCH NOW', 'Trending Zambian videos', 'Watch Now', '/videos', true, 4);

-- ======================
-- NOTIFICATIONS
-- ======================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL = broadcast
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info', -- info, success, warning, error
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ======================
-- STORAGE BUCKETS (via SQL)
-- ======================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('songs', 'songs', true),
  ('videos', 'videos', true),
  ('thumbnails', 'thumbnails', true),
  ('avatars', 'avatars', true),
  ('banners', 'banners', true),
  ('sponsors', 'sponsors', true),
  ('nominees', 'nominees', true)
ON CONFLICT (id) DO NOTHING;

-- ======================
-- INDEXES
-- ======================
CREATE INDEX idx_songs_user_id ON songs(user_id);
CREATE INDEX idx_songs_status ON songs(status);
CREATE INDEX idx_songs_play_count ON songs(play_count DESC);
CREATE INDEX idx_songs_created_at ON songs(created_at DESC);
CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_view_count ON videos(view_count DESC);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_lipila_txn ON payments(lipila_transaction_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_nominees_category ON nominees(category_id);
CREATE INDEX idx_votes_nominee ON votes(nominee_id);
CREATE INDEX idx_hero_banners_active ON hero_banners(is_active, display_order);

-- ======================
-- TRIGGERS
-- ======================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_songs_updated_at BEFORE UPDATE ON songs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_videos_updated_at BEFORE UPDATE ON videos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Sync new auth users to profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, role)
  VALUES (NEW.id, NEW.email, NEW.phone, 'user'::public.user_role);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ======================
-- SECURITY DEFINER HELPERS
-- ======================
CREATE OR REPLACE FUNCTION get_user_role(uid uuid)
RETURNS public.user_role LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM profiles WHERE id = uid;
$$;

CREATE OR REPLACE FUNCTION get_song_owner(song_id uuid)
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id FROM songs WHERE id = song_id;
$$;

CREATE OR REPLACE FUNCTION get_video_owner(video_id uuid)
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id FROM videos WHERE id = video_id;
$$;

-- Increment play count safely
CREATE OR REPLACE FUNCTION increment_play_count(song_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE songs SET play_count = play_count + 1 WHERE id = song_id;
$$;

CREATE OR REPLACE FUNCTION increment_view_count(video_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE videos SET view_count = view_count + 1 WHERE id = video_id;
$$;

-- ======================
-- RLS ENABLE
-- ======================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nominees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;

-- ======================
-- RLS POLICIES
-- ======================

-- PROFILES
CREATE POLICY "Admin full access profiles" ON profiles FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Users view own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (role IS NOT DISTINCT FROM get_user_role(auth.uid()));
CREATE POLICY "Public profiles view" ON profiles FOR SELECT TO anon USING (true);

-- SONGS
CREATE POLICY "Admin full access songs" ON songs FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Anyone view approved songs" ON songs FOR SELECT TO anon USING (status = 'approved');
CREATE POLICY "Auth view approved songs" ON songs FOR SELECT TO authenticated USING (status = 'approved' OR user_id = auth.uid());
CREATE POLICY "Users insert own songs" ON songs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own songs" ON songs FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own songs" ON songs FOR DELETE TO authenticated USING (user_id = auth.uid());

-- VIDEOS
CREATE POLICY "Admin full access videos" ON videos FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Anyone view approved videos" ON videos FOR SELECT TO anon USING (status = 'approved');
CREATE POLICY "Auth view approved videos" ON videos FOR SELECT TO authenticated USING (status = 'approved' OR user_id = auth.uid());
CREATE POLICY "Users insert own videos" ON videos FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own videos" ON videos FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own videos" ON videos FOR DELETE TO authenticated USING (user_id = auth.uid());

-- PAYMENTS (users see only their own)
CREATE POLICY "Admin full access payments" ON payments FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Users view own payments" ON payments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own payments" ON payments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Service role update payments" ON payments FOR UPDATE TO authenticated USING (get_user_role(auth.uid()) = 'admin');

-- UPLOAD PLANS (public read)
CREATE POLICY "Anyone view active plans" ON upload_plans FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Auth view active plans" ON upload_plans FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admin manage plans" ON upload_plans FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');

-- USER SUBSCRIPTIONS
CREATE POLICY "Admin full access subscriptions" ON user_subscriptions FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Users view own subscriptions" ON user_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own subscriptions" ON user_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- CONTENT LIKES
CREATE POLICY "Admin full access likes" ON content_likes FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Users manage own likes" ON content_likes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Anyone view likes" ON content_likes FOR SELECT TO anon USING (true);

-- USER LIBRARY
CREATE POLICY "Users manage own library" ON user_library FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin view library" ON user_library FOR SELECT TO authenticated USING (get_user_role(auth.uid()) = 'admin');

-- AWARDS
CREATE POLICY "Anyone view active awards" ON awards FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Auth view awards" ON awards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage awards" ON awards FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');

-- AWARD CATEGORIES
CREATE POLICY "Anyone view award categories" ON award_categories FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Auth view award categories" ON award_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage award categories" ON award_categories FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');

-- NOMINEES
CREATE POLICY "Anyone view nominees" ON nominees FOR SELECT TO anon USING (registration_status = 'successful');
CREATE POLICY "Auth view nominees" ON nominees FOR SELECT TO authenticated USING (registration_status = 'successful' OR user_id = auth.uid());
CREATE POLICY "Users insert own nominations" ON nominees FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own nominations" ON nominees FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin manage nominees" ON nominees FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');

-- VOTES
CREATE POLICY "Users view own votes" ON votes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own votes" ON votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin manage votes" ON votes FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Anon view vote counts" ON votes FOR SELECT TO anon USING (payment_status = 'successful');

-- SPONSORS
CREATE POLICY "Anyone view active sponsors" ON sponsors FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Auth view sponsors" ON sponsors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage sponsors" ON sponsors FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');

-- HERO BANNERS
CREATE POLICY "Anyone view active banners" ON hero_banners FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Auth view banners" ON hero_banners FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage banners" ON hero_banners FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');

-- NOTIFICATIONS
CREATE POLICY "Users view own notifications" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin manage notifications" ON notifications FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');

-- APP SETTINGS
CREATE POLICY "Anyone view settings" ON app_settings FOR SELECT TO anon USING (true);
CREATE POLICY "Auth view settings" ON app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage settings" ON app_settings FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');

-- ARTISTS
CREATE POLICY "Anyone view artists" ON artists FOR SELECT TO anon USING (true);
CREATE POLICY "Auth view artists" ON artists FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own artist" ON artists FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin manage artists" ON artists FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');

-- Storage policies
CREATE POLICY "Public read songs" ON storage.objects FOR SELECT TO public USING (bucket_id = 'songs');
CREATE POLICY "Auth upload songs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'songs');
CREATE POLICY "Users manage own songs" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'songs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own songs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'songs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read videos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'videos');
CREATE POLICY "Auth upload videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'videos');
CREATE POLICY "Users manage own videos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own videos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read thumbnails" ON storage.objects FOR SELECT TO public USING (bucket_id = 'thumbnails');
CREATE POLICY "Auth upload thumbnails" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'thumbnails');
CREATE POLICY "Auth update thumbnails" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'thumbnails');
CREATE POLICY "Auth delete thumbnails" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'thumbnails');

CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
CREATE POLICY "Auth upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Auth update avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Auth delete avatars" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');

CREATE POLICY "Public read banners" ON storage.objects FOR SELECT TO public USING (bucket_id = 'banners');
CREATE POLICY "Admin upload banners" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'banners');
CREATE POLICY "Admin update banners" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'banners');
CREATE POLICY "Admin delete banners" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'banners');

CREATE POLICY "Public read sponsors" ON storage.objects FOR SELECT TO public USING (bucket_id = 'sponsors');
CREATE POLICY "Admin upload sponsors" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'sponsors');
CREATE POLICY "Admin manage sponsors storage" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'sponsors');

CREATE POLICY "Public read nominees" ON storage.objects FOR SELECT TO public USING (bucket_id = 'nominees');
CREATE POLICY "Auth upload nominees" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'nominees');
CREATE POLICY "Auth manage own nominees" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'nominees');
