import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export function usePurchases() {
  const user = useAuthStore((state) => state.user)
  return useQuery({
    queryKey: ['purchases', user?.id],
    queryFn: async () => {
      if (!user || !supabase) return []
      const { data, error } = await supabase.from('purchases').select('*').eq('user_id', user.id).order('purchased_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useCreatePurchase() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  return useMutation({
    mutationFn: async ({ itemType, itemId, price, currency }: { itemType: string; itemId: string; price: number; currency: string }) => {
      if (!user || !supabase) throw new Error('Not authenticated')
      const { data, error } = await supabase.from('purchases').insert({ user_id: user.id, item_type: itemType, item_id: itemId, price, currency }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchases'] }) },
  })
}
