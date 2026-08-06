export * from './useMusic'
export * from './useVideo'
export * from './useStore'
export * from './useEvents'
export * from './useSearch'
export * from './useCategories'
export * from './usePurchases'

import { useQuery } from '@tanstack/react-query'
import { supabase, isConfigured } from '@/lib/supabase'
import { mockSongs, mockVideos } from '@/lib/mockData'

export function useGlobalSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      if (!query.trim() || !isConfigured || !supabase) return { songs: mockSongs, videos: mockVideos, albums: [], artists: [] }
      const [songs, videos] = await Promise.all([
        supabase.from('songs').select('*, artist:artists(*)').ilike('title', `%${query}%`).limit(10),
        supabase.from('videos').select('*, artist:artists(*)').ilike('title', `%${query}%`).limit(10),
      ])
      return { songs: songs.data || [], videos: videos.data || [], albums: [], artists: [] }
    },
    enabled: !!query.trim(),
  })
}

export function useArtistVideos(artistId: string) {
  return useQuery({
    queryKey: ['videos', 'artist', artistId],
    queryFn: async () => {
      if (!isConfigured || !supabase) return mockVideos
      const { data, error } = await supabase.from('videos').select('*, genre:categories(*)').eq('artist_id', artistId).eq('deleted_at', null).order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!artistId,
  })
}

export function useArtistEvents(artistId: string) {
  return useQuery({
    queryKey: ['events', 'artist', artistId],
    queryFn: async () => {
      if (!isConfigured || !supabase) return []
      const { data, error } = await supabase.from('events').select('*').eq('artist_id', artistId).eq('is_active', true).order('event_date', { ascending: true })
      if (error) throw error
      return data
    },
    enabled: !!artistId,
  })
}

export function useSellerMerchandise(sellerId: string) {
  return useQuery({
    queryKey: ['merchandise', 'seller', sellerId],
    queryFn: async () => {
      if (!isConfigured || !supabase) return []
      const { data, error } = await supabase.from('merchandise').select('*, artist:artists(*)').eq('seller_id', sellerId).eq('is_active', true).order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!sellerId,
  })
}

export function useHeroSliders() {
  return useQuery({
    queryKey: ['heroSliders'],
    queryFn: async () => {
      if (!isConfigured || !supabase) return [{ id: '1', title: 'Welcome to ZedVevo', subtitle: 'Stream music and more', image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200', button_text: 'Get Started', button_link: '/music', button_color: '#00D4FF', is_active: true, scheduled_start: null, scheduled_end: null, sort_order: 1, created_at: '', updated_at: '' }]
      const { data, error } = await supabase.from('hero_sliders').select('*').eq('is_active', true).order('sort_order', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export function useUpcomingEvents(limit = 5) {
  return useQuery({
    queryKey: ['events', 'upcoming', limit],
    queryFn: async () => {
      if (!isConfigured || !supabase) return []
      const { data, error } = await supabase.from('events').select('*, artist:artists(*)').eq('is_active', true).gte('event_date', new Date().toISOString().split('T')[0]).order('event_date', { ascending: true }).limit(limit)
      if (error) throw error
      return data
    },
  })
}

export function useCreateOrder() {
  return { mutate: () => {}, mutateAsync: async (_data: any) => ({ id: 'mock-order-id' }), isPending: false }
}

export function useCheckout() {
  return { mutate: () => {}, mutateAsync: async (_orderId: string) => ({}), isPending: false }
}
