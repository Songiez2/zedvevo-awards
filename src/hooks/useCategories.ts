import { useQuery } from '@tanstack/react-query'
import { supabase, isConfigured, type Category } from '@/lib/supabase'
import { mockCategories } from '@/lib/mockData'

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      if (!isConfigured || !supabase) return mockCategories
      const { data, error } = await supabase.from('categories').select('*').eq('is_active', true).order('sort_order', { ascending: true })
      if (error) throw error
      return data as Category[]
    },
  })
}
