// Notification Service
import { supabase, isConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

class NotificationService {
  async send(notification: { user_id: string; type: string; title: string; message: string; data?: any }) {
    if (!isConfigured) return { success: false, error: 'Supabase not configured' }
    try {
      const { error } = await supabase.from('notifications').insert(notification)
      if (error) return { success: false, error: error.message }
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
  async getNotifications(limit = 20): Promise<any[]> {
    if (!isConfigured) return []
    const user = useAuthStore.getState().user
    if (!user) return []
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit)
    return data || []
  }
  async markAsRead(id: string): Promise<void> {
    if (!isConfigured) return
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }
  async getUnreadCount(): Promise<number> {
    if (!isConfigured) return 0
    const user = useAuthStore.getState().user
    if (!user) return 0
    const { count } = await supabase.from('notifications').select('*', { count: 'exact' }).eq('user_id', user.id).eq('read', false)
    return count || 0
  }
}
export const notificationService = new NotificationService()
export default notificationService
