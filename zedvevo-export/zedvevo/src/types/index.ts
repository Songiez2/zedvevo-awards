export interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  withCount?: boolean;
}

export type UserRole = 'user' | 'admin' | 'super_admin';
export type ContentStatus = 'pending' | 'approved' | 'rejected';
export type PaymentStatus = 'pending' | 'successful' | 'failed' | 'cancelled' | 'insufficient_funds' | 'invalid_transaction';
export type PaymentMethod = 'mobile_money' | 'card';
export type PlanType = 'k10_single' | 'k100_weekly' | 'k300_yearly';

export interface Profile {
  id: string;
  email?: string;
  phone?: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface AppSetting {
  key: string;
  value: string;
  description?: string;
  updated_at: string;
}

export interface UploadPlan {
  id: string;
  name: string;
  plan_type: PlanType;
  price: number;
  description?: string;
  uploads_allowed: number | null;
  validity_days: number | null;
  is_active: boolean;
  created_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  plan_type: PlanType;
  uploads_used: number;
  uploads_allowed: number | null;
  activated_at?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  upload_plans?: UploadPlan;
}

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  payment_method: PaymentMethod;
  lipila_transaction_id?: string;
  lipila_reference?: string;
  plan_id?: string;
  subscription_id?: string;
  payment_type: 'plan' | 'nominee_registration' | 'vote';
  status: PaymentStatus;
  failure_reason?: string;
  phone_number?: string;
  metadata?: Record<string, unknown>;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
  upload_plans?: UploadPlan;
}

export interface Artist {
  id: string;
  user_id?: string;
  name: string;
  bio?: string;
  avatar_url?: string;
  cover_url?: string;
  genre?: string;
  is_featured: boolean;
  play_count: number;
  created_at: string;
}

export interface Song {
  id: string;
  user_id: string;
  artist_id?: string;
  title: string;
  artist_name: string;
  album?: string;
  genre?: string;
  cover_url?: string;
  thumbnail_url?: string;
  file_url: string;
  duration?: number;
  play_count: number;
  like_count: number;
  download_count: number;
  share_count: number;
  featured_artists?: string;
  producer?: string;
  status: ContentStatus;
  is_trending: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  profiles?: { username?: string; display_name?: string };
  liked?: boolean;
  saved?: boolean;
}

export interface Video {
  id: string;
  user_id: string;
  artist_id?: string;
  title: string;
  artist_name: string;
  description?: string;
  genre?: string;
  thumbnail_url?: string;
  file_url: string;
  duration?: number;
  view_count: number;
  like_count: number;
  download_count: number;
  share_count: number;
  downloads_enabled: boolean;
  featured_artists?: string;
  producer?: string;
  status: ContentStatus;
  is_trending: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  profiles?: { username?: string; display_name?: string };
  liked?: boolean;
  saved?: boolean;
}

export interface ContentLike {
  id: string;
  user_id: string;
  content_id: string;
  content_type: 'song' | 'video';
  created_at: string;
}

export interface UserLibraryItem {
  id: string;
  user_id: string;
  content_id: string;
  content_type: 'song' | 'video';
  created_at: string;
}

export interface Award {
  id: string;
  name: string;
  description?: string;
  year: number;
  season_label?: string;
  is_active: boolean;
  voting_open: boolean;
  nominees_open: boolean;
  voting_starts_at?: string;
  voting_ends_at?: string;
  created_at: string;
  award_categories?: AwardCategory[];
}

export interface VisitorLog {
  id: string;
  visited_at: string;
  page: string;
  session_id?: string;
  user_agent?: string;
  referrer?: string;
}

export interface AwardCategory {
  id: string;
  award_id: string;
  name: string;
  description?: string;
  grand_prize?: string;
  is_active: boolean;
  created_at: string;
  nominees?: Nominee[];
  awards?: Award;
}

export interface Nominee {
  id: string;
  user_id: string;
  category_id: string;
  name: string;
  bio?: string;
  photo_url?: string;
  song_title?: string;
  song_url?: string;
  video_url?: string;
  achievements?: string;
  social_links?: string;   // JSON string: { facebook?, twitter?, instagram?, linkedin? }
  total_votes: number;
  payment_id?: string;
  registration_status: PaymentStatus;
  nomination_status: 'pending_payment' | 'pending_review' | 'approved' | 'rejected' | 'winner';
  is_winner: boolean;
  created_at: string;
  award_categories?: AwardCategory;
  profiles?: { username?: string; display_name?: string };
}

export interface Download {
  id: string;
  user_id: string;
  content_id: string;
  content_type: 'song' | 'video';
  file_url: string;
  title: string;
  artist_name: string;
  cover_url?: string;
  downloaded_at: string;
}

export type WeeklyCategory = 'most_played' | 'most_downloaded' | 'most_viewed' | 'most_liked' | 'most_shared';

export interface WeeklyTrending {
  id: string;
  week_start: string;
  content_id: string;
  content_type: 'song' | 'video';
  rank: number;
  category: WeeklyCategory;
  metric_value: number;
  title: string;
  artist_name: string;
  cover_url?: string;
  created_at: string;
}

export interface WinnerOfMonth {
  id: string;
  month: number;
  year: number;
  artist_name: string;
  award: string;
  award_category?: string;
  photo_url?: string;
  prize?: string;
  description?: string;
  is_published: boolean;
  created_by?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export type SearchFilter = 'all' | 'music' | 'videos' | 'artists' | 'awards';
export type SearchSort = 'relevance' | 'newest' | 'most_played' | 'most_downloaded' | 'most_viewed';

export interface SearchResult {
  type: 'song' | 'video' | 'artist' | 'nominee';
  id: string;
  title: string;
  subtitle: string;
  cover_url?: string;
  metadata?: Record<string, unknown>;
}

export interface Vote {
  id: string;
  user_id: string;
  nominee_id: string;
  category_id: string;
  amount: number;
  vote_count: number;
  payment_id?: string;
  payment_status: PaymentStatus;
  created_at: string;
  nominees?: Nominee;
}

export interface Sponsor {
  id: string;
  award_id?: string;
  name: string;
  logo_url?: string;
  website_url?: string;
  tier: 'gold' | 'silver' | 'bronze';
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface HeroBanner {
  id: string;
  image_url: string;
  title: string;
  subtitle?: string;
  button_text?: string;
  button_url?: string;
  starts_at?: string;
  ends_at?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  notification_type: string;
  link?: string;
  metadata?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface HelpMessage {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface LipilaPaymentResponse {
  success: boolean;
  transaction_id?: string;
  reference?: string;
  payment_url?: string;
  status: PaymentStatus;
  message?: string;
}

export interface PaymentInitResult {
  payment_id: string;
  status: PaymentStatus;
  payment_url?: string;
  message: string;
  failure_reason?: string;
}

