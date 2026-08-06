import { useQuery } from '@tanstack/react-query'
import { supabase, isConfigured, type Event, type Ticket } from '@/lib/supabase'
import { mockEvents } from '@/lib/mockData'

export function useEvents(limit = 20) {
  return useQuery({
    queryKey: ['events', { limit }],
    queryFn: async () => {
      if (!isConfigured || !supabase) return mockEvents.slice(0, limit)
      const { data, error } = await supabase.from('events').select('*, artist:artists(*)').eq('is_active', true).order('event_date', { ascending: true }).limit(limit)
      if (error) throw error
      return data as Event[]
    },
  })
}

export function useFeaturedEvents(limit = 10) {
  return useQuery({
    queryKey: ['events', 'featured', limit],
    queryFn: async () => {
      if (!isConfigured || !supabase) return mockEvents.slice(0, limit)
      const { data, error } = await supabase.from('events').select('*, artist:artists(*)').eq('is_active', true).eq('is_featured', true).order('event_date', { ascending: true }).limit(limit)
      if (error) throw error
      return data as Event[]
    },
  })
}

export function useEvent(slug: string) {
  return useQuery({
    queryKey: ['event', slug],
    queryFn: async () => {
      if (!isConfigured || !supabase) return mockEvents[0]
      const { data, error } = await supabase.from('events').select('*, artist:artists(*)').eq('slug', slug).single()
      if (error) throw error
      return data as Event
    },
    enabled: !!slug,
  })
}

export function useEventTickets(eventId: string) {
  return useQuery({
    queryKey: ['tickets', eventId],
    queryFn: async () => {
      if (!isConfigured || !supabase) return []
      const { data, error } = await supabase.from('tickets').select('*').eq('event_id', eventId).eq('status', 'available')
      if (error) throw error
      return data as Ticket[]
    },
    enabled: !!eventId,
  })
}
