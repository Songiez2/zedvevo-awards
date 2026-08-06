import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isConfigured, type Video } from '@/lib/supabase'
import { mockVideos } from '@/lib/mockData'
import { useAuthStore } from '@/store/authStore'

export function useVideos(limit = 20) {
  return useQuery({
    queryKey: ['videos', { limit }],
    queryFn: async () => {
      if (!isConfigured || !supabase) return mockVideos.slice(0, limit)
      const { data, error } = await supabase.from('videos').select('*, artist:artists(*), genre:categories(*)').eq('deleted_at', null).order('view_count', { ascending: false }).limit(limit)
      if (error) throw error
      return data as Video[]
    },
  })
}

export function useFeaturedVideos(limit = 10) {
  return useQuery({
    queryKey: ['videos', 'featured', limit],
    queryFn: async () => {
      if (!isConfigured || !supabase) return mockVideos.slice(0, limit)
      const { data, error } = await supabase.from('videos').select('*, artist:artists(*), genre:categories(*)').eq('is_featured', true).eq('deleted_at', null).order('view_count', { ascending: false }).limit(limit)
      if (error) throw error
      return data as Video[]
    },
  })
}

export function useTrendingVideos(limit = 20) {
  return useQuery({
    queryKey: ['videos', 'trending', limit],
    queryFn: async () => {
      if (!isConfigured || !supabase) return mockVideos.slice(0, limit)
      const { data, error } = await supabase.from('videos').select('*, artist:artists(*), genre:categories(*)').eq('deleted_at', null).order('view_count', { ascending: false }).limit(limit)
      if (error) throw error
      return data as Video[]
    },
  })
}

export function useVideo(slug: string) {
  return useQuery({
    queryKey: ['video', slug],
    queryFn: async () => {
      if (!isConfigured || !supabase) return mockVideos[0]
      const { data, error } = await supabase.from('videos').select('*, artist:artists(*), song:songs(*), genre:categories(*)').eq('slug', slug).single()
      if (error) throw error
      return data as Video
    },
    enabled: !!slug,
  })
}

export function useCreateVideo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (video: Partial<Video>) => {
      if (!supabase) throw new Error('Supabase not configured')
      const { data, error } = await supabase.from('videos').insert(video).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['videos'] }) },
  })
}

export function useToggleVideoFavorite() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  return useMutation({
    mutationFn: async (videoId: string) => {
      if (!user || !supabase) throw new Error('Not authenticated')
      const { data: existing } = await supabase.from('favorites').select('id').eq('user_id', user.id).eq('video_id', videoId).single()
      if (existing) { await supabase.from('favorites').delete().eq('id', existing.id); return { action: 'removed' } }
      else { await supabase.from('favorites').insert({ user_id: user.id, video_id: videoId }); return { action: 'added' } }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['favorites'] }) },
  })
}
