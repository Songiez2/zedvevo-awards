// Ticket Service - Admin event ticket management
import { supabase, isConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

class TicketService {
  async createEvent(eventData: any): Promise<{ success: boolean; error?: string; eventId?: string }> {
    if (!isConfigured) return { success: false, error: 'Supabase not configured' }
    const user = useAuthStore.getState().user
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return { success: false, error: 'Only admins can create events' }
    }
    try {
      const { data, error } = await supabase.from('events').insert({
        event_name: eventData.event_name,
        venue: eventData.venue,
        date: eventData.date,
        time: eventData.time,
        price: eventData.price,
        quantity: eventData.quantity,
        description: eventData.description,
      }).select().single()
      if (error) return { success: false, error: error.message }
      return { success: true, eventId: data.id }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
  async getEvents(params: any = {}): Promise<any[]> {
    if (!isConfigured) return []
    let query = supabase.from('events').select('*')
    if (params.upcoming) query = query.gte('date', new Date().toISOString().split('T')[0])
    query = query.order('date', { ascending: true }).limit(params.limit || 20)
    const { data } = await query
    return data || []
  }
}
export const ticketService = new TicketService()
export default ticketService
