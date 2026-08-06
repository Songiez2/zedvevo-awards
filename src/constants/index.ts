export const APP_NAME = 'ZedVevo'
export const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:5173'

export const ARTIST_PLANS = {
  daily: {
    name: 'Daily',
    price: 20,
    currency: 'ZMW',
    duration: 1,
    durationUnit: 'day',
    songLimit: 1,
    features: ['1 Song Upload', '1 Day Access', 'Basic Analytics'],
  },
  weekly: {
    name: 'Weekly',
    price: 100,
    currency: 'ZMW',
    duration: 7,
    durationUnit: 'days',
    songLimit: 8,
    features: ['8 Songs Upload', '7 Days Access', 'Standard Analytics', 'Priority Support'],
  },
  annual: {
    name: 'Annual',
    price: 500,
    currency: 'ZMW',
    duration: 365,
    durationUnit: 'days',
    songLimit: -1,
    features: ['Unlimited Uploads', '1 Year Access', 'Advanced Analytics', 'Priority Support', 'Featured Placement'],
  },
}

export const MERCHANDISE_CATEGORIES = [
  'Clothing',
  'Shoes',
  'Caps',
  'Accessories',
  'Music Equipment',
  'Other',
]

export const MERCHANDISE_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size']
export const MERCHANDISE_COLORS = [
  'Black',
  'White',
  'Gray',
  'Navy',
  'Red',
  'Blue',
  'Green',
  'Yellow',
  'Purple',
  'Pink',
  'Orange',
  'Brown',
]

export const TICKET_TYPES = ['General', 'VIP', 'VVIP', 'Early Bird']

export const ORDER_STATUS = {
  pending: { label: 'Pending', color: 'text-yellow-500' },
  paid: { label: 'Paid', color: 'text-green-500' },
  shipped: { label: 'Shipped', color: 'text-blue-500' },
  delivered: { label: 'Delivered', color: 'text-green-600' },
  cancelled: { label: 'Cancelled', color: 'text-red-500' },
}

export const PAYMENT_TYPES = {
  artist_subscription: 'Artist Subscription',
  song_purchase: 'Song Purchase',
  album_purchase: 'Album Purchase',
  video_purchase: 'Video Purchase',
  merchandise: 'Merchandise Order',
  ticket: 'Event Ticket',
}

export const NOTIFICATION_TYPES = {
  payment_success: 'Payment Successful',
  purchase_complete: 'Purchase Completed',
  artist_activated: 'Artist Account Activated',
  ticket_purchased: 'Ticket Purchased',
  merchandise_sold: 'Merchandise Sold',
  new_follower: 'New Follower',
  new_comment: 'New Comment',
  system: 'System Notification',
}

import {
  LayoutDashboard, Users, Mic, Music, Disc, Video, Tag, Image,
  Ticket, ShoppingBag, CreditCard, Package, Bell, BarChart, Settings,
  Upload, Calendar, DollarSign, Play, ListMusic
} from 'lucide-react'

export const ADMIN_NAV = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Artists', href: '/admin/artists', icon: Mic },
  { label: 'Songs', href: '/admin/songs', icon: Music },
  { label: 'Albums', href: '/admin/albums', icon: Disc },
  { label: 'Videos', href: '/admin/videos', icon: Video },
  { label: 'Categories', href: '/admin/categories', icon: Tag },
  { label: 'Hero Slider', href: '/admin/hero', icon: Image },
  { label: 'Tickets', href: '/admin/tickets', icon: Ticket },
  { label: 'Merchandise', href: '/admin/merchandise', icon: ShoppingBag },
  { label: 'Payments', href: '/admin/payments', icon: CreditCard },
  { label: 'Orders', href: '/admin/orders', icon: Package },
  { label: 'Notifications', href: '/admin/notifications', icon: Bell },
  { label: 'Reports', href: '/admin/reports', icon: BarChart },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

export const ARTIST_NAV = [
  { label: 'Dashboard', href: '/artist', icon: LayoutDashboard },
  { label: 'Upload Music', href: '/artist/upload', icon: Upload },
  { label: 'Upload Video', href: '/artist/upload-video', icon: Video },
  { label: 'My Albums', href: '/artist/albums', icon: Disc },
  { label: 'My Songs', href: '/artist/songs', icon: Music },
  { label: 'My Videos', href: '/artist/videos', icon: Play },
  { label: 'Events', href: '/artist/events', icon: Calendar },
  { label: 'Merchandise', href: '/artist/merchandise', icon: ShoppingBag },
  { label: 'Analytics', href: '/artist/analytics', icon: BarChart },
  { label: 'Revenue', href: '/artist/revenue', icon: DollarSign },
  { label: 'Settings', href: '/artist/settings', icon: Settings },
]

import { Home, Library } from 'lucide-react'

export const MOBILE_NAV = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Music', href: '/music', icon: Music },
  { label: 'Videos', href: '/videos', icon: Video },
  { label: 'Store', href: '/store', icon: ShoppingBag },
  { label: 'Library', href: '/library', icon: Library },
]

export const DESKTOP_NAV = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Music', href: '/music', icon: Music },
  { label: 'Videos', href: '/videos', icon: Video },
  { label: 'Store', href: '/store', icon: ShoppingBag },
  { label: 'Artists', href: '/artists', icon: Mic },
]

export const LIPILA_CONFIG = {
  apiKey: import.meta.env.VITE_LIPILA_API_KEY || '',
  merchantId: import.meta.env.VITE_LIPILA_MERCHANT_ID || '',
  serviceId: import.meta.env.VITE_LIPILA_SERVICE_ID || '',
  apiUrl: 'https://api.lipila.com/v1',
}

export const STORAGE_BUCKETS = {
  music: 'music',
  videos: 'videos',
  albums: 'albums',
  products: 'products',
  profiles: 'profiles',
  artists: 'artists',
  hero: 'hero',
  tickets: 'tickets',
  images: 'images',
}

export const DEFAULT_COVER_URL = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500'
export const DEFAULT_AVATAR_URL = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'
export const DEFAULT_ARTIST_COVER = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200'
