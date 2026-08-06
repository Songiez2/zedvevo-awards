import { create } from 'zustand'
import { supabase, type Notification } from '@/lib/supabase'
import { useAuthStore } from './authStore'

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  isConnected: boolean
  fetchNotifications: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  subscribeToNotifications: () => void
  unsubscribeFromNotifications: () => void
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isConnected: false,

  fetchNotifications: async () => {
    const user = useAuthStore.getState().user
    if (!user) {
      set({ notifications: [], unreadCount: 0 })
      return
    }

    set({ isLoading: true })

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      const unreadCount = data?.filter((n) => !n.is_read).length || 0

      set({ notifications: data || [], unreadCount })
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  markAsRead: async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  },

  markAllAsRead: async () => {
    const user = useAuthStore.getState().user
    if (!user) return

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) throw error

      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          is_read: true,
          read_at: n.read_at || new Date().toISOString(),
        })),
        unreadCount: 0,
      }))
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  },

  deleteNotification: async (id) => {
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id)

      if (error) throw error

      set((state) => {
        const notification = state.notifications.find((n) => n.id === id)
        return {
          notifications: state.notifications.filter((n) => n.id !== id),
          unreadCount: notification && !notification.is_read
            ? state.unreadCount - 1
            : state.unreadCount,
        }
      })
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  },

  subscribeToNotifications: () => {
    const user = useAuthStore.getState().user
    if (!user) return

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification
          set((state) => ({
            notifications: [newNotification, ...state.notifications],
            unreadCount: state.unreadCount + 1,
          }))
        }
      )
      .subscribe()

    set({ isConnected: true })

    return () => {
      supabase.removeChannel(channel)
      set({ isConnected: false })
    }
  },

  unsubscribeFromNotifications: () => {
    supabase.removeChannel(supabase.channel('notifications'))
    set({ isConnected: false })
  },
}))
