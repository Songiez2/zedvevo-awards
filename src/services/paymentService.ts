// Payment Service - Handles all payment operations
import { supabase, isConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { lipilaService } from './lipila'

export interface PaymentRecord {
  id: string
  user_id: string
  provider: string
  payment_reference: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  payment_type: string
  reference_id: string
  metadata: Record<string, any>
  created_at: string
  completed_at?: string
}

class PaymentService {
  // Check if user has purchased an item
  async hasPurchased(itemType: string, itemId: string): Promise<boolean> {
    if (!isConfigured) {
      return false
    }

    const user = useAuthStore.getState().user
    if (!user) {
      return false
    }

    const { data } = await supabase
      .from('purchases')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .eq('status', 'completed')
      .single()

    return !!data
  }

  // Purchase a song
  async purchaseSong(
    songId: string,
    amount: number,
    phoneNumber: string
  ): Promise<{ success: boolean; error?: string; paymentId?: string }> {
    if (!isConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    const user = useAuthStore.getState().user
    if (!user) {
      return { success: false, error: 'Please login to purchase' }
    }

    // Check if already purchased
    const alreadyPurchased = await this.hasPurchased('song', songId)
    if (alreadyPurchased) {
      return { success: true, paymentId: 'already-owned' }
    }

    // Get song details
    const { data: song } = await supabase
      .from('songs')
      .select('title')
      .eq('id', songId)
      .single()

    return lipilaService.purchaseSong(songId, amount, song?.title || 'Song', phoneNumber)
  }

  // Purchase a video
  async purchaseVideo(
    videoId: string,
    amount: number,
    phoneNumber: string
  ): Promise<{ success: boolean; error?: string; paymentId?: string }> {
    if (!isConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    const user = useAuthStore.getState().user
    if (!user) {
      return { success: false, error: 'Please login to purchase' }
    }

    const alreadyPurchased = await this.hasPurchased('video', videoId)
    if (alreadyPurchased) {
      return { success: true, paymentId: 'already-owned' }
    }

    const { data: video } = await supabase
      .from('videos')
      .select('title')
      .eq('id', videoId)
      .single()

    return lipilaService.purchaseVideo(videoId, amount, video?.title || 'Video', phoneNumber)
  }

  // Purchase a ticket
  async purchaseTicket(
    eventId: string,
    ticketPrice: number,
    eventTitle: string,
    phoneNumber: string
  ): Promise<{ success: boolean; error?: string; paymentId?: string }> {
    if (!isConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    const user = useAuthStore.getState().user
    if (!user) {
      return { success: false, error: 'Please login to purchase' }
    }

    // Check ticket availability
    const { data: event } = await supabase
      .from('events')
      .select('quantity, tickets_sold')
      .eq('id', eventId)
      .single()

    if (!event || event.tickets_sold >= event.quantity) {
      return { success: false, error: 'No tickets available' }
    }

    return lipilaService.purchaseTicket(eventId, ticketPrice, eventTitle, phoneNumber)
  }

  // Purchase merchandise
  async purchaseMerchandise(
    orderData: {
      items: Array<{ merchandiseId: string; quantity: number; price: number }>
      total: number
      shippingAddress?: string
    },
    phoneNumber: string
  ): Promise<{ success: boolean; error?: string; orderId?: string }> {
    if (!isConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    const user = useAuthStore.getState().user
    if (!user) {
      return { success: false, error: 'Please login to purchase' }
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        total: orderData.total,
        status: 'pending',
        shipping_address: orderData.shippingAddress,
      })
      .select()
      .single()

    if (orderError || !order) {
      return { success: false, error: 'Failed to create order' }
    }

    // Create order items
    const orderItems = orderData.items.map(item => ({
      order_id: order.id,
      merchandise_id: item.merchandiseId,
      quantity: item.quantity,
      price: item.price,
    }))

    await supabase.from('order_items').insert(orderItems)

    // Process payment
    const result = await lipilaService.purchaseMerchandise(order.id, orderData.total, phoneNumber)

    if (result.success) {
      return { success: true, orderId: order.id }
    }

    // Delete order if payment failed
    await supabase.from('orders').delete().eq('id', order.id)
    return { success: false, error: result.error }
  }

  // Get payment history
  async getPaymentHistory(): Promise<PaymentRecord[]> {
    if (!isConfigured) {
      return []
    }

    const user = useAuthStore.getState().user
    if (!user) {
      return []
    }

    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    return data || []
  }

  // Get purchase history
  async getPurchaseHistory(): Promise<any[]> {
    if (!isConfigured) {
      return []
    }

    const user = useAuthStore.getState().user
    if (!user) {
      return []
    }

    const { data } = await supabase
      .from('purchases')
      .select('*, songs:item_id(*), videos:item_id(*)')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })

    return data || []
  }

  // Get user's tickets
  async getUserTickets(): Promise<any[]> {
    if (!isConfigured) {
      return []
    }

    const user = useAuthStore.getState().user
    if (!user) {
      return []
    }

    const { data } = await supabase
      .from('tickets')
      .select('*, events:event_id(*)')
      .eq('user_id', user.id)
      .order('purchased_at', { ascending: false })

    return data || []
  }

  // Get user's orders
  async getUserOrders(): Promise<any[]> {
    if (!isConfigured) {
      return []
    }

    const user = useAuthStore.getState().user
    if (!user) {
      return []
    }

    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, merchandise(*))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    return data || []
  }

  // Verify payment status
  async verifyPayment(paymentId: string): Promise<{
    status: 'pending' | 'completed' | 'failed' | 'refunded'
    error?: string
  }> {
    if (!isConfigured) {
      return { status: 'failed', error: 'Supabase not configured' }
    }

    const result = await lipilaService.checkPaymentStatus(paymentId)
    return { status: result.status, error: result.error }
  }

  // Download purchased song
  async downloadSong(songId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    if (!isConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    const user = useAuthStore.getState().user
    if (!user) {
      return { success: false, error: 'Please login to download' }
    }

    // Check if user has purchased or if song is free
    const { data: song } = await supabase
      .from('songs')
      .select('audio_url, is_free')
      .eq('id', songId)
      .single()

    if (!song) {
      return { success: false, error: 'Song not found' }
    }

    // Free songs can be downloaded by any logged-in user
    if (song.is_free) {
      // Record download
      await this.recordDownload(songId)
      return { success: true, url: song.audio_url }
    }

    // Check purchase for paid songs
    const hasPurchased = await this.hasPurchased('song', songId)
    if (!hasPurchased) {
      return { success: false, error: 'Please purchase this song to download' }
    }

    // Record download
    await this.recordDownload(songId)
    return { success: true, url: song.audio_url }
  }

  // Record download
  private async recordDownload(songId: string): Promise<void> {
    const user = useAuthStore.getState().user
    if (!user) return

    await supabase.from('downloads').insert({
      user_id: user.id,
      song_id: songId,
      download_date: new Date().toISOString(),
    })

    // Increment download count
    await supabase.rpc('increment', {
      table_name: 'songs',
      row_id: songId,
      column_name: 'downloads',
    })
  }
}

export const paymentService = new PaymentService()
export default paymentService
