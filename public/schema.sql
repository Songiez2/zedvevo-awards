-- ZedVevo Database Schema
-- Supabase PostgreSQL with RLS, Triggers, and Audit Logs

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'artist', 'user');
CREATE TYPE artist_plan AS ENUM ('daily', 'weekly', 'annual');
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled', 'pending');
CREATE TYPE ticket_status AS ENUM ('available', 'sold', 'used', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'shipped', 'delivered', 'cancelled');
CREATE TYPE media_type AS ENUM ('song', 'video');
CREATE TYPE album_type AS ENUM ('single', 'ep', 'album');
CREATE TYPE content_access AS ENUM ('free', 'premium');

-- ============================================
-- PROFILES TABLE
-- ============================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    username TEXT UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    role user_role DEFAULT 'user',
    is_artist BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    social_links JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{"theme": "dark", "notifications": true}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================
-- ARTIST SUBSCRIPTIONS TABLE
-- ============================================

CREATE TABLE artist_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan artist_plan NOT NULL,
    status subscription_status DEFAULT 'pending',
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    song_limit INTEGER,
    upload_count INTEGER DEFAULT 0,
    price DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'ZMW',
    payment_id UUID,
    auto_renew BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CATEGORIES TABLE
-- ============================================

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    image_url TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ARTISTS TABLE
-- ============================================

CREATE TABLE artists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    stage_name TEXT NOT NULL,
    bio TEXT,
    cover_image_url TEXT,
    website TEXT,
    social_links JSONB DEFAULT '{}',
    monthly_listeners INTEGER DEFAULT 0,
    total_streams INTEGER DEFAULT 0,
    total_followers INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ============================================
-- ALBUMS TABLE
-- ============================================

CREATE TABLE albums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    cover_url TEXT,
    genre_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    album_type album_type DEFAULT 'album',
    release_date DATE,
    price DECIMAL(10, 2) DEFAULT 0,
    currency TEXT DEFAULT 'ZMW',
    access content_access DEFAULT 'free',
    track_count INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0,
    total_streams INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_explicit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================
-- SONGS TABLE
-- ============================================

CREATE TABLE songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    album_id UUID REFERENCES albums(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    audio_url TEXT NOT NULL,
    cover_url TEXT,
    duration INTEGER NOT NULL,
    genre_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    price DECIMAL(10, 2) DEFAULT 0,
    currency TEXT DEFAULT 'ZMW',
    access content_access DEFAULT 'free',
    lyrics TEXT,
    isrc TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    is_explicit BOOLEAN DEFAULT FALSE,
    play_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================
-- VIDEOS TABLE
-- ============================================

CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    song_id UUID REFERENCES songs(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration INTEGER NOT NULL,
    quality JSONB DEFAULT '{"720p": true, "1080p": true, "480p": true}',
    genre_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    price DECIMAL(10, 2) DEFAULT 0,
    currency TEXT DEFAULT 'ZMW',
    access content_access DEFAULT 'free',
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_music_video BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================
-- HERO SLIDER TABLE
-- ============================================

CREATE TABLE hero_sliders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    subtitle TEXT,
    image_url TEXT NOT NULL,
    button_text TEXT,
    button_link TEXT,
    button_color TEXT DEFAULT '#00D4FF',
    is_active BOOLEAN DEFAULT TRUE,
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PLAYLISTS TABLE
-- ============================================

CREATE TABLE playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    song_count INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================
-- PLAYLIST SONGS TABLE
-- ============================================

CREATE TABLE playlist_songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(playlist_id, song_id)
);

-- ============================================
-- FAVORITES TABLE
-- ============================================

CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
    artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (
        (song_id IS NOT NULL)::int + 
        (video_id IS NOT NULL)::int + 
        (album_id IS NOT NULL)::int + 
        (artist_id IS NOT NULL)::int = 1
    )
);

-- ============================================
-- FOLLOWS TABLE
-- ============================================

CREATE TABLE follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, artist_id)
);

-- ============================================
-- PLAYS TABLE (for tracking play history)
-- ============================================

CREATE TABLE plays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    device_id TEXT,
    played_at TIMESTAMPTZ DEFAULT NOW(),
    duration_played INTEGER,
    completed BOOLEAN DEFAULT FALSE
);

-- ============================================
-- DOWNLOADS TABLE
-- ============================================

CREATE TABLE downloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    downloaded_at TIMESTAMPTZ DEFAULT NOW(),
    device_info JSONB DEFAULT '{}'
);

-- ============================================
-- PURCHASES TABLE
-- ============================================

CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL,
    item_id UUID NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'ZMW',
    payment_id UUID,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAYMENTS TABLE
-- ============================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'ZMW',
    payment_method TEXT,
    payment_type TEXT NOT NULL,
    reference_id TEXT,
    external_id TEXT,
    status payment_status DEFAULT 'pending',
    metadata JSONB DEFAULT '{}',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EVENTS TABLE
-- ============================================

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    banner_url TEXT,
    venue TEXT NOT NULL,
    address TEXT,
    city TEXT,
    country TEXT DEFAULT 'Zambia',
    event_date TIMESTAMPTZ NOT NULL,
    doors_open TIMESTAMPTZ,
    ticket_price DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'ZMW',
    total_tickets INTEGER NOT NULL,
    tickets_sold INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TICKETS TABLE
-- ============================================

CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    ticket_type TEXT DEFAULT 'General',
    ticket_number TEXT UNIQUE NOT NULL,
    qr_code TEXT,
    status ticket_status DEFAULT 'available',
    price DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'ZMW',
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    purchased_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MERCHANDISE TABLE
-- ============================================

CREATE TABLE merchandise (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    artist_id UUID REFERENCES artists(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'ZMW',
    stock INTEGER NOT NULL DEFAULT 0,
    sold_count INTEGER DEFAULT 0,
    images JSONB NOT NULL,
    sizes JSONB DEFAULT '[]',
    colors JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================
-- ORDERS TABLE
-- ============================================

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status order_status DEFAULT 'pending',
    subtotal DECIMAL(10, 2) NOT NULL,
    shipping_fee DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'ZMW',
    shipping_address JSONB,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORDER ITEMS TABLE
-- ============================================

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    merchandise_id UUID NOT NULL REFERENCES merchandise(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    size TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CART TABLE
-- ============================================

CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    merchandise_id UUID NOT NULL REFERENCES merchandise(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    size TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, merchandise_id, size, color)
);

-- ============================================
-- COMMENTS TABLE
-- ============================================

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SITE SETTINGS TABLE
-- ============================================

CREATE TABLE site_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SPONSORS TABLE
-- ============================================

CREATE TABLE sponsors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    logo_url TEXT,
    website TEXT,
    tier TEXT DEFAULT 'bronze',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ADVERTISEMENTS TABLE
-- ============================================

CREATE TABLE advertisements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    link TEXT,
    position TEXT NOT NULL,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    clicks_count INTEGER DEFAULT 0,
    impressions_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DEVICE MUSIC TABLE (for offline/local music)
-- ============================================

CREATE TABLE device_music (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    title TEXT,
    artist TEXT,
    album TEXT,
    duration INTEGER,
    file_size INTEGER,
    mime_type TEXT,
    metadata JSONB DEFAULT '{}',
    last_played TIMESTAMPTZ,
    play_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_artists_user_id ON artists(user_id);
CREATE INDEX idx_artists_featured ON artists(featured);
CREATE INDEX idx_albums_artist_id ON albums(artist_id);
CREATE INDEX idx_albums_genre_id ON albums(genre_id);
CREATE INDEX idx_albums_featured ON albums(is_featured);
CREATE INDEX idx_songs_artist_id ON songs(artist_id);
CREATE INDEX idx_songs_album_id ON songs(album_id);
CREATE INDEX idx_songs_genre_id ON songs(genre_id);
CREATE INDEX idx_songs_featured ON songs(is_featured);
CREATE INDEX idx_videos_artist_id ON videos(artist_id);
CREATE INDEX idx_videos_featured ON videos(is_featured);
CREATE INDEX idx_playlists_user_id ON playlists(user_id);
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_follows_artist_id ON follows(artist_id);
CREATE INDEX idx_plays_user_id ON plays(user_id);
CREATE INDEX idx_plays_song_id ON plays(song_id);
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_events_artist_id ON events(artist_id);
CREATE INDEX idx_events_featured ON events(is_featured);
CREATE INDEX idx_tickets_event_id ON tickets(event_id);
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_merchandise_seller_id ON merchandise(seller_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_device_music_user_id ON device_music(user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (
        COALESCE(NEW.user_id, current_setting('app.current_user_id', true)::uuid),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set the first user as super admin or specific admin emails
CREATE OR REPLACE FUNCTION set_first_user_as_super_admin()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM profiles) = 0 THEN
        NEW.role = 'super_admin';
    END IF;
    -- Make topkuchalo@gmail.com a super admin
    IF NEW.email = 'topkuchalo@gmail.com' THEN
        NEW.role = 'super_admin';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update song count on albums
CREATE OR REPLACE FUNCTION update_album_song_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE albums SET track_count = track_count + 1, total_duration = total_duration + (SELECT duration FROM songs WHERE id = NEW.song_id)
        WHERE id = NEW.album_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE albums SET track_count = track_count - 1, total_duration = total_duration - (SELECT duration FROM songs WHERE id = OLD.song_id)
        WHERE id = OLD.album_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update artist follower count
CREATE OR REPLACE FUNCTION update_artist_follower_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE artists SET total_followers = total_followers + 1 WHERE id = NEW.artist_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE artists SET total_followers = total_followers - 1 WHERE id = OLD.artist_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update play count
CREATE OR REPLACE FUNCTION update_play_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.song_id IS NOT NULL THEN
        UPDATE songs SET play_count = play_count + 1 WHERE id = NEW.song_id;
    END IF;
    IF NEW.video_id IS NOT NULL THEN
        UPDATE videos SET view_count = view_count + 1 WHERE id = NEW.video_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update download count
CREATE OR REPLACE FUNCTION update_download_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.song_id IS NOT NULL THEN
        UPDATE songs SET download_count = download_count + 1 WHERE id = NEW.song_id;
    ELSIF NEW.video_id IS NOT NULL THEN
        UPDATE videos SET download_count = download_count + 1 WHERE id = NEW.video_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update artist subscription upload count
CREATE OR REPLACE FUNCTION update_artist_upload_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'songs' AND TG_OP = 'INSERT' THEN
        UPDATE artist_subscriptions SET upload_count = upload_count + 1 WHERE user_id = (SELECT user_id FROM artists WHERE id = NEW.artist_id) AND status = 'active';
    ELSIF TG_TABLE_NAME = 'videos' AND TG_OP = 'INSERT' THEN
        UPDATE artist_subscriptions SET upload_count = upload_count + 1 WHERE user_id = (SELECT user_id FROM artists WHERE id = NEW.artist_id) AND status = 'active';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ticket_number IS NULL THEN
        NEW.ticket_number = 'ZV-' || UPPER(SUBSTRING(NEW.event_id::text FROM 1 FOR 8)) || '-' || LPAD(NEW.id::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Updated at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_artists_updated_at BEFORE UPDATE ON artists FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_albums_updated_at BEFORE UPDATE ON albums FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_songs_updated_at BEFORE UPDATE ON songs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON playlists FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_hero_sliders_updated_at BEFORE UPDATE ON hero_sliders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_merchandise_updated_at BEFORE UPDATE ON merchandise FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON site_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Audit log triggers
CREATE TRIGGER audit_profiles AFTER INSERT OR UPDATE OR DELETE ON profiles FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_songs AFTER INSERT OR UPDATE OR DELETE ON songs FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_videos AFTER INSERT OR UPDATE OR DELETE ON videos FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_albums AFTER INSERT OR UPDATE OR DELETE ON albums FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_merchandise AFTER INSERT OR UPDATE OR DELETE ON merchandise FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_orders AFTER INSERT OR UPDATE OR DELETE ON orders FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON payments FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- Set first user as super admin
CREATE TRIGGER set_super_admin BEFORE INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION set_first_user_as_super_admin();

-- Update album song count
CREATE TRIGGER update_album_count AFTER INSERT OR DELETE ON playlist_songs FOR EACH ROW EXECUTE FUNCTION update_album_song_count();

-- Update artist follower count
CREATE TRIGGER update_follower_count AFTER INSERT OR DELETE ON follows FOR EACH ROW EXECUTE FUNCTION update_artist_follower_count();

-- Update play count
CREATE TRIGGER update_media_play_count AFTER INSERT ON plays FOR EACH ROW EXECUTE FUNCTION update_play_count();

-- Update download count
CREATE TRIGGER update_media_download_count AFTER INSERT ON downloads FOR EACH ROW EXECUTE FUNCTION update_download_count();

-- Update artist upload count
CREATE TRIGGER update_artist_upload AFTER INSERT ON songs FOR EACH ROW EXECUTE FUNCTION update_artist_upload_count();
CREATE TRIGGER update_artist_video_upload AFTER INSERT ON videos FOR EACH ROW EXECUTE FUNCTION update_artist_upload_count();

-- Generate ticket number
CREATE TRIGGER generate_ticket BEFORE INSERT ON tickets FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchandise ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_music ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_sliders ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('super_admin', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is artist
CREATE OR REPLACE FUNCTION is_artist()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND (role = 'artist' OR is_artist = TRUE)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can view all profiles (public info)
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT USING (deleted_at IS NULL);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- ARTISTS POLICIES
-- ============================================

-- Anyone can view artists
CREATE POLICY "Artists are viewable by everyone" ON artists
    FOR SELECT USING (TRUE);

-- Artists can update their own artist profile
CREATE POLICY "Artists can update own profile" ON artists
    FOR UPDATE USING (user_id = auth.uid());

-- Artists can insert their own artist profile
CREATE POLICY "Artists can insert own profile" ON artists
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- SONGS POLICIES
-- ============================================

-- Anyone can view songs
CREATE POLICY "Songs are viewable by everyone" ON songs
    FOR SELECT USING (deleted_at IS NULL);

-- Artists can insert songs (checked via subscription limits)
CREATE POLICY "Artists can insert songs" ON songs
    FOR INSERT WITH CHECK (
        artist_id IN (SELECT id FROM artists WHERE user_id = auth.uid())
    );

-- Artists can update their own songs
CREATE POLICY "Artists can update own songs" ON songs
    FOR UPDATE USING (
        artist_id IN (SELECT id FROM artists WHERE user_id = auth.uid())
    );

-- Artists can delete their own songs (soft delete)
CREATE POLICY "Artists can delete own songs" ON songs
    FOR DELETE USING (
        artist_id IN (SELECT id FROM artists WHERE user_id = auth.uid())
    );

-- ============================================
-- VIDEOS POLICIES
-- ============================================

-- Anyone can view videos
CREATE POLICY "Videos are viewable by everyone" ON videos
    FOR SELECT USING (deleted_at IS NULL);

-- Artists can insert videos
CREATE POLICY "Artists can insert videos" ON videos
    FOR INSERT WITH CHECK (
        artist_id IN (SELECT id FROM artists WHERE user_id = auth.uid())
    );

-- Artists can update their own videos
CREATE POLICY "Artists can update own videos" ON videos
    FOR UPDATE USING (
        artist_id IN (SELECT id FROM artists WHERE user_id = auth.uid())
    );

-- Artists can delete their own videos
CREATE POLICY "Artists can delete own videos" ON videos
    FOR DELETE USING (
        artist_id IN (SELECT id FROM artists WHERE user_id = auth.uid())
    );

-- ============================================
-- ALBUMS POLICIES
-- ============================================

-- Anyone can view albums
CREATE POLICY "Albums are viewable by everyone" ON albums
    FOR SELECT USING (deleted_at IS NULL);

-- Artists can manage their own albums
CREATE POLICY "Artists can manage own albums" ON albums
    FOR ALL USING (
        artist_id IN (SELECT id FROM artists WHERE user_id = auth.uid())
    );

-- ============================================
-- PLAYLISTS POLICIES
-- ============================================

-- Anyone can view public playlists
CREATE POLICY "Public playlists are viewable by everyone" ON playlists
    FOR SELECT USING (is_public = TRUE OR user_id = auth.uid());

-- Users can manage their own playlists
CREATE POLICY "Users can manage own playlists" ON playlists
    FOR ALL USING (user_id = auth.uid());

-- Playlist songs policies
CREATE POLICY "Users can view playlist songs" ON playlist_songs
    FOR SELECT USING (
        playlist_id IN (SELECT id FROM playlists WHERE user_id = auth.uid() OR is_public = TRUE)
    );

CREATE POLICY "Users can manage own playlist songs" ON playlist_songs
    FOR ALL USING (
        playlist_id IN (SELECT id FROM playlists WHERE user_id = auth.uid())
    );

-- ============================================
-- FAVORITES POLICIES
-- ============================================

-- Users can view their own favorites
CREATE POLICY "Users can view own favorites" ON favorites
    FOR SELECT USING (user_id = auth.uid());

-- Users can manage their own favorites
CREATE POLICY "Users can manage own favorites" ON favorites
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- FOLLOWS POLICIES
-- ============================================

-- Anyone can view follows
CREATE POLICY "Follows are viewable by everyone" ON follows
    FOR SELECT USING (TRUE);

-- Users can manage their own follows
CREATE POLICY "Users can manage own follows" ON follows
    FOR ALL USING (follower_id = auth.uid());

-- ============================================
-- PLAYS POLICIES
-- ============================================

-- Anyone can log plays (anonymous or authenticated)
CREATE POLICY "Anyone can insert plays" ON plays
    FOR INSERT WITH CHECK (TRUE);

-- Users can view their own plays
CREATE POLICY "Users can view own plays" ON plays
    FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

-- ============================================
-- DOWNLOADS POLICIES
-- ============================================

-- Users can view their own downloads
CREATE POLICY "Users can view own downloads" ON downloads
    FOR SELECT USING (user_id = auth.uid());

-- Users can insert downloads
CREATE POLICY "Users can insert downloads" ON downloads
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- PURCHASES POLICIES
-- ============================================

-- Users can view their own purchases
CREATE POLICY "Users can view own purchases" ON purchases
    FOR SELECT USING (user_id = auth.uid());

-- Users can insert purchases
CREATE POLICY "Users can insert purchases" ON purchases
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- PAYMENTS POLICIES
-- ============================================

-- Users can view their own payments
CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT USING (user_id = auth.uid());

-- Admins can view all payments
CREATE POLICY "Admins can view all payments" ON payments
    FOR SELECT USING (is_admin());

-- Users can insert payments
CREATE POLICY "Users can insert payments" ON payments
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- EVENTS POLICIES
-- ============================================

-- Anyone can view active events
CREATE POLICY "Active events are viewable by everyone" ON events
    FOR SELECT USING (is_active = TRUE);

-- Artists can manage their own events
CREATE POLICY "Artists can manage own events" ON events
    FOR ALL USING (
        artist_id IN (SELECT id FROM artists WHERE user_id = auth.uid())
    );

-- ============================================
-- TICKETS POLICIES
-- ============================================

-- Anyone can view available tickets
CREATE POLICY "Available tickets are viewable by everyone" ON tickets
    FOR SELECT USING (TRUE);

-- Users can manage their own tickets
CREATE POLICY "Users can manage own tickets" ON tickets
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- MERCHANDISE POLICIES
-- ============================================

-- Anyone can view active merchandise
CREATE POLICY "Active merchandise is viewable by everyone" ON merchandise
    FOR SELECT USING (is_active = TRUE AND deleted_at IS NULL);

-- Users can manage their own merchandise
CREATE POLICY "Users can manage own merchandise" ON merchandise
    FOR ALL USING (seller_id = auth.uid());

-- Admins can manage all merchandise
CREATE POLICY "Admins can manage all merchandise" ON merchandise
    FOR ALL USING (is_admin());

-- ============================================
-- ORDERS POLICIES
-- ============================================

-- Users can view their own orders
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (user_id = auth.uid());

-- Users can manage their own orders
CREATE POLICY "Users can manage own orders" ON orders
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- CART ITEMS POLICIES
-- ============================================

-- Users can view their own cart
CREATE POLICY "Users can view own cart" ON cart_items
    FOR SELECT USING (user_id = auth.uid());

-- Users can manage their own cart
CREATE POLICY "Users can manage own cart" ON cart_items
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- COMMENTS POLICIES
-- ============================================

-- Anyone can view comments
CREATE POLICY "Comments are viewable by everyone" ON comments
    FOR SELECT USING (TRUE);

-- Users can manage their own comments
CREATE POLICY "Users can manage own comments" ON comments
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- NOTIFICATIONS POLICIES
-- ============================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

-- Users can update their own notifications
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- DEVICE MUSIC POLICIES
-- ============================================

-- Users can manage their own device music
CREATE POLICY "Users can manage own device music" ON device_music
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- ARTIST SUBSCRIPTIONS POLICIES
-- ============================================

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON artist_subscriptions
    FOR SELECT USING (user_id = auth.uid());

-- Users can manage their own subscriptions
CREATE POLICY "Users can manage own subscriptions" ON artist_subscriptions
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- HERO SLIDERS POLICIES
-- ============================================

-- Anyone can view active hero sliders
CREATE POLICY "Active hero sliders are viewable by everyone" ON hero_sliders
    FOR SELECT USING (is_active = TRUE);

-- Admins can manage hero sliders
CREATE POLICY "Admins can manage hero sliders" ON hero_sliders
    FOR ALL USING (is_admin());

-- ============================================
-- CATEGORIES POLICIES
-- ============================================

-- Anyone can view active categories
CREATE POLICY "Active categories are viewable by everyone" ON categories
    FOR SELECT USING (is_active = TRUE);

-- Admins can manage categories
CREATE POLICY "Admins can manage categories" ON categories
    FOR ALL USING (is_admin());

-- ============================================
-- SITE SETTINGS POLICIES
-- ============================================

-- Anyone can view site settings
CREATE POLICY "Site settings are viewable by everyone" ON site_settings
    FOR SELECT USING (TRUE);

-- Admins can manage site settings
CREATE POLICY "Admins can manage site settings" ON site_settings
    FOR ALL USING (is_admin());

-- ============================================
-- SPONSORS POLICIES
-- ============================================

-- Anyone can view active sponsors
CREATE POLICY "Active sponsors are viewable by everyone" ON sponsors
    FOR SELECT USING (is_active = TRUE);

-- Admins can manage sponsors
CREATE POLICY "Admins can manage sponsors" ON sponsors
    FOR ALL USING (is_admin());

-- ============================================
-- ADVERTISEMENTS POLICIES
-- ============================================

-- Anyone can view active advertisements
CREATE POLICY "Active advertisements are viewable by everyone" ON advertisements
    FOR SELECT USING (is_active = TRUE AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW()));

-- Admins can manage advertisements
CREATE POLICY "Admins can manage advertisements" ON advertisements
    FOR ALL USING (is_admin());

-- ============================================
-- AUDIT LOGS POLICIES
-- ============================================

-- Admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT USING (is_admin());

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default categories
INSERT INTO categories (name, slug, icon, sort_order) VALUES
    ('Hip Hop', 'hip-hop', 'music', 1),
    ('Amapiano', 'amapiano', 'disc', 2),
    ('Zambian Music', 'zambian', 'flag', 3),
    ('Afrobeat', 'afrobeat', 'heart', 4),
    ('R&B', 'rnb', 'mic', 5),
    ('Gospel', 'gospel', 'cross', 6),
    ('Pop', 'pop', 'star', 7),
    ('Rock', 'rock', 'flame', 8),
    ('Jazz', 'jazz', 'coffee', 9),
    ('Reggae', 'reggae', 'sun', 10);

-- Insert default site settings
INSERT INTO site_settings (key, value, description) VALUES
    ('app_name', '"ZedVevo"', 'Application name'),
    ('app_logo', '"/logo.svg"', 'Application logo URL'),
    ('hero_slider_enabled', 'true', 'Enable/disable hero slider'),
    ('featured_artists_enabled', 'true', 'Enable/disable featured artists section'),
    ('new_releases_enabled', 'true', 'Enable/disable new releases section'),
    ('support_email', '"support@zedvevo.com"', 'Support email address'),
    ('currency', '"ZMW"', 'Default currency'),
    ('maintenance_mode', 'false', 'Enable/disable maintenance mode');

-- Insert default hero sliders
INSERT INTO hero_sliders (title, subtitle, image_url, button_text, button_link, sort_order) VALUES
    ('Welcome to ZedVevo', 'Stream the best Zambian music', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920', 'Explore Music', '/music', 1),
    ('Become an Artist', 'Start uploading your music today', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1920', 'Get Started', '/artist/become', 2),
    ('Shop Merchandise', 'Get official artist merchandise', 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=1920', 'Shop Now', '/store', 3);

-- ============================================
-- LIPILA CONFIGURATION
-- ============================================

CREATE TABLE IF NOT EXISTS lipila_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id TEXT NOT NULL,
    service_id TEXT NOT NULL,
    api_key TEXT NOT NULL,
    webhook_secret TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if user is admin (includes super_admin and admin)
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = check_user_id 
        AND role IN ('super_admin', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = check_user_id 
        AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-promote first user to super_admin
CREATE OR REPLACE FUNCTION auto_promote_first_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if there's no super admin yet
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE role = 'super_admin') THEN
        -- This is the first user, make them super admin
        UPDATE profiles SET role = 'super_admin' WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-promote first user to super admin
-- Note: This trigger should be manually attached after profile creation
-- We'll do this via the application logic instead

-- Generic increment function for sold counts
CREATE OR REPLACE FUNCTION increment_field(table_name TEXT, row_id UUID, column_name TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('UPDATE %I SET %I = %I + 1 WHERE id = $1', table_name, column_name, column_name) USING row_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- LIPILA CONFIG POLICIES
-- ============================================

-- Only super admin can manage Lipila config
CREATE POLICY "Super admins can manage lipila config" ON lipila_config
    FOR ALL USING (is_super_admin(auth.uid()));

-- ============================================
-- PROFILE HELPER FUNCTIONS
-- ============================================

-- Get user role
CREATE OR REPLACE FUNCTION get_user_role(check_user_id UUID)
RETURNS user_role AS $$
DECLARE
    user_role_val user_role;
BEGIN
    SELECT role INTO user_role_val FROM profiles WHERE id = check_user_id;
    RETURN COALESCE(user_role_val, 'user'::user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

