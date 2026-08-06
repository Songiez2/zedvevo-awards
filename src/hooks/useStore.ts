import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isConfigured, type Merchandise, type Order, type CartItem } from '@/lib/supabase'
import { mockMerchandise } from '@/lib/mockData'
import { useAuthStore } from '@/store/authStore'

export function useMerchandise(limit = 20) {
  return useQuery({
    queryKey: ['merchandise', { limit }],
    queryFn: async () => {
      if (!isConfigured || !supabase) return mockMerchandise.slice(0, limit)
      const { data, error } = await supabase.from('merchandise').select('*, seller:profiles(*), artist:artists(*)').eq('is_active', true).order('sold_count', { ascending: false }).limit(limit)
      if (error) throw error
      return data as Merchandise[]
    },
  })
}

export function useFeaturedMerchandise(limit = 10) {
  return useQuery({
    queryKey: ['merchandise', 'featured', limit],
    queryFn: async () => {
      if (!isConfigured || !supabase) return mockMerchandise.slice(0, limit)
      const { data, error } = await supabase.from('merchandise').select('*, seller:profiles(*), artist:artists(*)').eq('is_active', true).eq('is_featured', true).order('sold_count', { ascending: false }).limit(limit)
      if (error) throw error
      return data as Merchandise[]
    },
  })
}

export function useMerchandiseItem(slug: string) {
  return useQuery({
    queryKey: ['merchandise', slug],
    queryFn: async () => {
      if (!isConfigured || !supabase) return mockMerchandise[0]
      const { data, error } = await supabase.from('merchandise').select('*, seller:profiles(*), artist:artists(*)').eq('slug', slug).single()
      if (error) throw error
      return data as Merchandise
    },
    enabled: !!slug,
  })
}

export function useCart() {
  const user = useAuthStore((state) => state.user)
  return useQuery({
    queryKey: ['cart', user?.id],
    queryFn: async () => {
      if (!user || !supabase) return []
      const { data, error } = await supabase.from('cart_items').select('*, merchandise:merchandise(*)').eq('user_id', user.id)
      if (error) throw error
      return data as (CartItem & { merchandise: Merchandise })[]
    },
  })
}

export function useAddToCart() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  return useMutation({
    mutationFn: async ({ merchandiseId, quantity = 1, size, color }: { merchandiseId: string; quantity?: number; size?: string; color?: string }) => {
      if (!user || !supabase) throw new Error('Not authenticated')
      const { error } = await supabase.from('cart_items').insert({ user_id: user.id, merchandise_id: merchandiseId, quantity, size, color })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cart'] }) },
  })
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase not configured')
      const { error } = await supabase.from('cart_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cart'] }) },
  })
}

export function useOrders() {
  const user = useAuthStore((state) => state.user)
  return useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      if (!user || !supabase) return []
      const { data, error } = await supabase.from('orders').select('*, items:order_items(*, merchandise:merchandise(*))').eq('user_id', user.id).order('created_at', { ascending: false })
      if (error) throw error
      return data as Order[]
    },
  })
}
