import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null

export const isConfigured = !!(supabaseUrl && supabaseAnonKey)

export type Tables = {
  profiles: Profile
  artists: Artist
  albums: Album
  songs: Song
  videos: Video
  playlists: Playlist
  playlist_songs: PlaylistSong
  favorites: Favorite
  follows: Follow
  plays: Play
  downloads: Download
  purchases: Purchase
  payments: Payment
  events: Event
  tickets: Ticket
  merchandise: Merchandise
  orders: Order
  order_items: OrderItem
  cart_items: CartItem
  comments: Comment
  notifications: Notification
  categories: Category
  hero_sliders: HeroSlider
  device_music: DeviceMusic
  artist_subscriptions: ArtistSubscription
  site_settings: SiteSetting
  sponsors: Sponsor
  advertisements: Advertisement
  audit_logs: AuditLog
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  bio: string | null
  role: 'super_admin' | 'admin' | 'artist' | 'user'
  is_artist: boolean
  is_verified: boolean
  social_links: Record<string, string>
  preferences: Record<string, unknown>
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Artist {
  id: string
  user_id: string
  stage_name: string
  bio: string | null
  cover_image_url: string | null
  website: string | null
  social_links: Record<string, string>
  monthly_listeners: number
  total_streams: number
  total_followers: number
  verified: boolean
  featured: boolean
  created_at: string
  updated_at: string
  user?: Profile
}

export interface Album {
  id: string
  artist_id: string
  title: string
  slug: string
  description: string | null
  cover_url: string | null
  genre_id: string | null
  album_type: 'single' | 'ep' | 'album'
  release_date: string | null
  price: number
  currency: string
  access: 'free' | 'premium'
  track_count: number
  total_duration: number
  total_streams: number
  is_featured: boolean
  is_explicit: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  artist?: Artist
  songs?: Song[]
  genre?: Category
}

export interface Song {
  id: string
  artist_id: string
  album_id: string | null
  title: string
  slug: string
  description: string | null
  audio_url: string
  cover_url: string | null
  duration: number
  genre_id: string | null
  price: number
  currency: string
  access: 'free' | 'premium'
  lyrics: string | null
  isrc: string | null
  is_featured: boolean
  is_explicit: boolean
  play_count: number
  download_count: number
  created_at: string
  updated_at: string
  deleted_at: string | null
  artist?: Artist
  album?: Album
  genre?: Category
}

export interface Video {
  id: string
  artist_id: string
  song_id: string | null
  title: string
  slug: string
  description: string | null
  video_url: string
  thumbnail_url: string | null
  duration: number
  quality: Record<string, boolean>
  genre_id: string | null
  price: number
  currency: string
  access: 'free' | 'premium'
  view_count: number
  download_count: number
  is_featured: boolean
  is_music_video: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  artist?: Artist
  song?: Song
  genre?: Category
}

export interface Playlist {
  id: string
  user_id: string
  title: string
  description: string | null
  cover_url: string | null
  is_public: boolean
  is_featured: boolean
  song_count: number
  total_duration: number
  created_at: string
  updated_at: string
  deleted_at: string | null
  user?: Profile
  songs?: (PlaylistSong & { song: Song })[]
}

export interface PlaylistSong {
  id: string
  playlist_id: string
  song_id: string
  position: number
  added_at: string
}

export interface Favorite {
  id: string
  user_id: string
  song_id: string | null
  video_id: string | null
  album_id: string | null
  artist_id: string | null
  created_at: string
  song?: Song
  video?: Video
  album?: Album
  artist?: Artist
}

export interface Follow {
  id: string
  follower_id: string
  artist_id: string
  created_at: string
  follower?: Profile
  artist?: Artist
}

export interface Play {
  id: string
  user_id: string | null
  song_id: string | null
  video_id: string | null
  device_id: string | null
  played_at: string
  duration_played: number | null
  completed: boolean
}

export interface Download {
  id: string
  user_id: string
  song_id: string | null
  video_id: string | null
  downloaded_at: string
  device_info: Record<string, unknown>
}

export interface Purchase {
  id: string
  user_id: string
  item_type: string
  item_id: string
  price: number
  currency: string
  payment_id: string | null
  purchased_at: string
  created_at: string
}

export interface Payment {
  id: string
  user_id: string
  amount: number
  currency: string
  payment_method: string | null
  payment_type: string
  reference_id: string | null
  external_id: string | null
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  metadata: Record<string, unknown>
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  artist_id: string
  title: string
  slug: string
  description: string | null
  banner_url: string | null
  venue: string
  address: string | null
  city: string | null
  country: string
  event_date: string
  doors_open: string | null
  ticket_price: number
  currency: string
  total_tickets: number
  tickets_sold: number
  is_active: boolean
  is_featured: boolean
  created_at: string
  updated_at: string
  artist?: Artist
}

export interface Ticket {
  id: string
  event_id: string
  user_id: string | null
  ticket_type: string
  ticket_number: string
  qr_code: string | null
  status: 'available' | 'sold' | 'used' | 'cancelled'
  price: number
  currency: string
  payment_id: string | null
  purchased_at: string | null
  used_at: string | null
  created_at: string
  event?: Event
  user?: Profile
}

export interface Merchandise {
  id: string
  seller_id: string
  artist_id: string | null
  title: string
  slug: string
  description: string | null
  category: string
  price: number
  currency: string
  stock: number
  sold_count: number
  images: string[]
  sizes: string[]
  colors: string[]
  is_active: boolean
  is_featured: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  seller?: Profile
  artist?: Artist
}

export interface Order {
  id: string
  user_id: string
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  subtotal: number
  shipping_fee: number
  total: number
  currency: string
  shipping_address: ShippingAddress | null
  payment_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  user?: Profile
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  merchandise_id: string
  quantity: number
  unit_price: number
  total_price: number
  size: string | null
  color: string | null
  created_at: string
  merchandise?: Merchandise
}

export interface ShippingAddress {
  name: string
  phone: string
  address: string
  city: string
  province: string
  country: string
  postal_code?: string
}

export interface CartItem {
  id: string
  user_id: string
  merchandise_id: string
  quantity: number
  size: string | null
  color: string | null
  created_at: string
  merchandise?: Merchandise
}

export interface Comment {
  id: string
  user_id: string
  song_id: string | null
  video_id: string | null
  content: string
  parent_id: string | null
  likes_count: number
  created_at: string
  updated_at: string
  user?: Profile
  replies?: Comment[]
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string | null
  data: Record<string, unknown>
  is_read: boolean
  read_at: string | null
  created_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  image_url: string | null
  parent_id: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface HeroSlider {
  id: string
  title: string
  subtitle: string | null
  image_url: string
  button_text: string | null
  button_link: string | null
  button_color: string
  is_active: boolean
  scheduled_start: string | null
  scheduled_end: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface DeviceMusic {
  id: string
  user_id: string
  file_name: string
  file_path: string
  title: string | null
  artist: string | null
  album: string | null
  duration: number | null
  file_size: number | null
  mime_type: string | null
  metadata: Record<string, unknown>
  last_played: string | null
  play_count: number
  created_at: string
}

export interface ArtistSubscription {
  id: string
  user_id: string
  plan: 'daily' | 'weekly' | 'annual'
  status: 'active' | 'expired' | 'cancelled' | 'pending'
  start_date: string | null
  end_date: string | null
  song_limit: number | null
  upload_count: number
  price: number
  currency: string
  payment_id: string | null
  auto_renew: boolean
  created_at: string
  updated_at: string
}

export interface SiteSetting {
  id: string
  key: string
  value: unknown
  description: string | null
  updated_at: string
}

export interface Sponsor {
  id: string
  name: string
  logo_url: string | null
  website: string | null
  tier: string
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface Advertisement {
  id: string
  title: string
  image_url: string
  link: string | null
  position: string
  start_date: string | null
  end_date: string | null
  is_active: boolean
  clicks_count: number
  impressions_count: number
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  table_name: string | null
  record_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export type TablesInsert<T extends keyof Tables> = Omit<Tables[T], 'id' | 'created_at' | 'updated_at'>
export type TablesUpdate<T extends keyof Tables> = Partial<Omit<Tables[T], 'id' | 'created_at'>>
