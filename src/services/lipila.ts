import { supabase, type Payment } from '@/lib/supabase'
import { LIPILA_CONFIG, ARTIST_PLANS } from '@/constants'
import { generateId } from '@/utils'
import { useAuthStore } from '@/store/authStore'

interface LipilaMobileMoneyPaymentRequest {
  amount: number
  currency: string
  description: string
  reference: string
  callbackUrl: string
  customer: {
    name: string
    email: string
    phone: string
  }
  paymentMethod: 'mobile_money'
  network?: 'mtn' | 'airtel'
}

interface LipilaPaymentResponse {
  success: boolean
  paymentId?: string
  checkoutUrl?: string
  error?: string
  message?: string
  status?: 'pending' | 'processing' | 'completed' | 'failed'
}

interface LipilaVerificationResponse {
  success: boolean
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  amount?: number
  reference?: string
  error?: string
}

// Mobile money network detection based on phone number
export function detectNetwork(phone: string): 'mtn' | 'airtel' | null {
  const cleanPhone = phone.replace(/\D/g, '')
  // Zambia phone number patterns
  // MTN: 076, 095, 096 (also 097 for MTN)
  // Airtel: 077, 078, 079
  // Accept formats: 097xxxxxx, 77xxxxxx, 26097xxxxxx, 26077xxxxxx, etc.
  
  if (
    cleanPhone.startsWith('26076') || 
    cleanPhone.startsWith('26095') || 
    cleanPhone.startsWith('26096') ||
    cleanPhone.startsWith('26097') ||
    cleanPhone.startsWith('076') || 
    cleanPhone.startsWith('095') || 
    cleanPhone.startsWith('096') ||
    cleanPhone.startsWith('097') ||
    cleanPhone.startsWith('76') ||
    cleanPhone.startsWith('95') ||
    cleanPhone.startsWith('96') ||
    cleanPhone.startsWith('97')
  ) {
    return 'mtn'
  }
  if (
    cleanPhone.startsWith('26077') || 
    cleanPhone.startsWith('26078') || 
    cleanPhone.startsWith('26079') ||
    cleanPhone.startsWith('077') || 
    cleanPhone.startsWith('078') || 
    cleanPhone.startsWith('079') ||
    cleanPhone.startsWith('77') ||
    cleanPhone.startsWith('78') ||
    cleanPhone.startsWith('79')
  ) {
    return 'airtel'
  }
  return null
}

export const lipilaService = {
  async createMobileMoneyPayment(
    type: string,
    itemId: string,
    amount: number,
    description: string,
    phoneNumber: string
  ): Promise<LipilaPaymentResponse> {
    const user = useAuthStore.getState().user
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Validate phone number
    const network = detectNetwork(phoneNumber)
    if (!network) {
      return { 
        success: false, 
        error: 'Invalid phone number. Please use MTN (097, 076, 095, 096) or Airtel (077, 078, 079) number.' 
      }
    }

    const reference = `ZV-${type.toUpperCase()}-${generateId()}`
    const callbackUrl = `${window.location.origin}/api/lipila/webhook`

    const paymentRequest: LipilaMobileMoneyPaymentRequest = {
      amount,
      currency: 'ZMW',
      description,
      reference,
      callbackUrl,
      customer: {
        name: user.full_name || user.email,
        email: user.email,
        phone: phoneNumber,
      },
      paymentMethod: 'mobile_money',
      network,
    }

    try {
      // Create payment record in database
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          amount,
          currency: 'ZMW',
          payment_type: type,
          reference_id: reference,
          status: 'pending',
          metadata: {
            item_id: itemId,
            description,
            phone_number: phoneNumber,
            network,
          },
        })
        .select()
        .single()

      if (paymentError) {
        console.error('Error creating payment record:', paymentError)
        return { success: false, error: paymentError.message }
      }

      // Call Lipila API for mobile money payment
      const response = await fetch(`${LIPILA_CONFIG.apiUrl}/payments/mobile-money`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LIPILA_CONFIG.apiKey}`,
          'X-API-Key': LIPILA_CONFIG.apiKey,
        },
        body: JSON.stringify(paymentRequest),
      })

      const data = await response.json()

      if (!response.ok) {
        // Update payment status to failed
        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('id', payment.id)
        
        return { 
          success: false, 
          error: data.message || data.error || 'Payment initiation failed. Please try again.' 
        }
      }

      // Update payment with external ID
      await supabase
        .from('payments')
        .update({ external_id: data.paymentId || data.reference })
        .eq('id', payment.id)

      // If payment requires OTP/verification, status will be pending
      // User will receive an SMS to confirm on their phone
      if (data.status === 'pending' || data.message?.includes('OTP') || data.message?.includes('confirm')) {
        return {
          success: true,
          paymentId: payment.id,
          status: 'pending',
          message: 'Payment request sent! Please check your phone and enter your PIN to confirm.',
        }
      }

      // If payment completed immediately
      if (data.status === 'completed') {
        await supabase
          .from('payments')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', payment.id)
        
        // Process the successful payment
        await handleSuccessfulPayment(payment.id, payment)
        
        return {
          success: true,
          paymentId: payment.id,
          status: 'completed',
          message: 'Payment successful! Your plan has been activated.',
        }
      }

      return {
        success: true,
        paymentId: payment.id,
        status: 'processing',
        message: data.message || 'Payment request sent. Please confirm on your phone.',
      }
    } catch (error) {
      console.error('Error creating mobile money payment:', error)
      
      // Update payment status to failed
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
      
      return { success: false, error: 'Payment initiation failed. Please check your phone number and try again.' }
    }
  },

  async checkPaymentStatus(paymentId: string): Promise<LipilaVerificationResponse> {
    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single()

      if (error || !payment) {
        return { success: false, status: 'failed', error: 'Payment not found' }
      }

      // If already completed or failed in our system, return that status
      if (payment.status === 'completed') {
        return { success: true, status: 'completed', amount: payment.amount }
      }
      if (payment.status === 'failed') {
        return { success: false, status: 'failed', error: 'Payment was rejected or failed' }
      }

      // Call Lipila API to check real-time status
      const response = await fetch(
        `${LIPILA_CONFIG.apiUrl}/payments/${payment.reference_id}/status`,
        {
          headers: {
            'Authorization': `Bearer ${LIPILA_CONFIG.apiKey}`,
            'X-API-Key': LIPILA_CONFIG.apiKey,
          },
        }
      )

      if (!response.ok) {
        // Return current status if API call fails
        return { 
          success: false, 
          status: payment.status as 'pending' | 'completed' | 'failed' | 'refunded',
          error: 'Could not verify payment status'
        }
      }

      const data = await response.json()

      // Update local payment status
      const newStatus = data.status === 'completed' ? 'completed' 
        : data.status === 'failed' ? 'failed' 
        : data.status === 'refunded' ? 'refunded' 
        : 'pending'

      await supabase
        .from('payments')
        .update({
          status: newStatus,
          completed_at: data.status === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', paymentId)

      // Process successful payment
      if (newStatus === 'completed' && payment.status !== 'completed') {
        await handleSuccessfulPayment(paymentId, payment)
      }

      return {
        success: newStatus === 'completed',
        status: newStatus as 'pending' | 'completed' | 'failed' | 'refunded',
        amount: data.amount || payment.amount,
        reference: payment.reference_id,
      }
    } catch (error) {
      console.error('Error checking payment status:', error)
      return { success: false, status: 'pending', error: 'Verification failed' }
    }
  },

  async subscribeArtist(planType: 'daily' | 'weekly' | 'annual', price: number, phoneNumber: string): Promise<LipilaPaymentResponse> {
    return this.createMobileMoneyPayment('artist_subscription', planType, price, `Artist Plan: ${planType}`, phoneNumber)
  },

  async purchaseArtistPlan(planType: 'daily' | 'weekly' | 'annual', phoneNumber: string): Promise<LipilaPaymentResponse> {
    const plan = ARTIST_PLANS[planType]
    const description = `ZedVevo ${plan.name} Artist Plan`

    return this.createMobileMoneyPayment('artist_subscription', planType, plan.price, description, phoneNumber)
  },

  async purchaseSong(songId: string, price: number, title: string, phoneNumber: string): Promise<LipilaPaymentResponse> {
    return this.createMobileMoneyPayment('song_purchase', songId, price, `Song: ${title}`, phoneNumber)
  },

  async purchaseAlbum(albumId: string, price: number, title: string, phoneNumber: string): Promise<LipilaPaymentResponse> {
    return this.createMobileMoneyPayment('album_purchase', albumId, price, `Album: ${title}`, phoneNumber)
  },

  async purchaseVideo(videoId: string, price: number, title: string, phoneNumber: string): Promise<LipilaPaymentResponse> {
    return this.createMobileMoneyPayment('video_purchase', videoId, price, `Video: ${title}`, phoneNumber)
  },

  async purchaseMerchandise(orderId: string, total: number, phoneNumber: string): Promise<LipilaPaymentResponse> {
    return this.createMobileMoneyPayment('merchandise', orderId, total, 'Merchandise Order', phoneNumber)
  },

  async purchaseTicket(eventId: string, ticketPrice: number, eventTitle: string, phoneNumber: string): Promise<LipilaPaymentResponse> {
    return this.createMobileMoneyPayment('ticket', eventId, ticketPrice, `Ticket: ${eventTitle}`, phoneNumber)
  },

  async handleWebhook(payload: Record<string, unknown>): Promise<void> {
    const { reference, status } = payload

    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .select('*')
        .eq('reference_id', reference)
        .single()

      if (error || !payment) {
        console.error('Payment not found for webhook:', reference)
        return
      }

      const newStatus = status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'pending'

      await supabase
        .from('payments')
        .update({
          status: newStatus,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', payment.id)

      if (status === 'completed') {
        await handleSuccessfulPayment(payment.id, payment)
      }
    } catch (error) {
      console.error('Error handling webhook:', error)
    }
  },

  async getPaymentHistory(): Promise<Payment[]> {
    const user = useAuthStore.getState().user
    if (!user) return []

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching payment history:', error)
      return []
    }

    return data || []
  },
}

async function handleSuccessfulPayment(paymentId: string, payment: Payment): Promise<void> {
  const userId = payment.user_id
  if (!userId) return

  const metadata = payment.metadata as Record<string, unknown>

  switch (payment.payment_type) {
    case 'artist_subscription':
      await activateArtistSubscription(userId, metadata.item_id as string, paymentId)
      break

    case 'song_purchase':
      await createPurchase(userId, 'song', metadata.item_id as string, payment.amount, paymentId)
      break

    case 'album_purchase':
      await createPurchase(userId, 'album', metadata.item_id as string, payment.amount, paymentId)
      break

    case 'video_purchase':
      await createPurchase(userId, 'video', metadata.item_id as string, payment.amount, paymentId)
      break

    case 'ticket':
      await createTicket(userId, metadata.item_id as string, paymentId, payment.amount)
      break

    case 'merchandise':
      await updateOrderStatus(metadata.item_id as string, paymentId)
      break
  }

  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'payment_success',
    title: 'Payment Successful',
    message: `Your payment of ZMW ${payment.amount} has been processed successfully.`,
    data: { payment_id: paymentId },
  })
}

async function activateArtistSubscription(
  userId: string,
  planType: string,
  paymentId: string
): Promise<void> {
  const plan = ARTIST_PLANS[planType as keyof typeof ARTIST_PLANS]
  if (!plan) return

  const startDate = new Date()
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + plan.duration)

  const subscription = {
    user_id: userId,
    plan: planType,
    status: 'active' as const,
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    song_limit: plan.songLimit,
    upload_count: 0,
    price: plan.price,
    currency: plan.currency,
    payment_id: paymentId,
    auto_renew: false,
  }

  const { error } = await supabase.from('artist_subscriptions').insert(subscription)

  if (!error) {
    await supabase
      .from('profiles')
      .update({ is_artist: true, role: 'artist' })
      .eq('id', userId)

    const { data: artistExists } = await supabase
      .from('artists')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!artistExists) {
      const { data: userData } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', userId)
        .single()
      
      await supabase.from('artists').insert({
        user_id: userId,
        stage_name: userData?.full_name || userData?.username || 'New Artist',
      })
    }

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'artist_activated',
      title: 'Artist Account Activated',
      message: `Your ${plan.name} artist plan is now active. You can start uploading music!`,
      data: { plan: planType },
    })

    // Refresh auth state
    useAuthStore.getState().fetchUser()
  }
}

async function createPurchase(
  userId: string,
  itemType: string,
  itemId: string,
  price: number,
  paymentId: string
): Promise<void> {
  await supabase.from('purchases').insert({
    user_id: userId,
    item_type: itemType,
    item_id: itemId,
    price,
    payment_id: paymentId,
  })

  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'purchase_complete',
    title: 'Purchase Complete',
    message: `Your ${itemType} has been unlocked and is now available in your library.`,
    data: { item_type: itemType, item_id: itemId },
  })
}

async function createTicket(
  userId: string,
  eventId: string,
  paymentId: string,
  price: number
): Promise<void> {
  const { data: event } = await supabase
    .from('events')
    .select('title')
    .eq('id', eventId)
    .single()

  // Create ticket
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .insert({
      event_id: eventId,
      user_id: userId,
      status: 'sold',
      price,
      currency: 'ZMW',
      payment_id: paymentId,
      purchased_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (!ticketError && ticket) {
    // Generate QR code (simplified - in production, use a proper QR library)
    const qrData = JSON.stringify({
      ticket_id: ticket.id,
      event_id: eventId,
      ticket_number: ticket.ticket_number,
    })

    // Update ticket with QR code
    await supabase
      .from('tickets')
      .update({ qr_code: `data:text/plain;base64,${btoa(qrData)}` })
      .eq('id', ticket.id)

    // Update tickets sold count
    await supabase.rpc('increment', {
      table_name: 'events',
      row_id: eventId,
      column_name: 'tickets_sold',
    })
  }

  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'ticket_purchased',
    title: 'Ticket Purchased',
    message: `Your ticket for ${event?.title || 'the event'} has been confirmed.`,
    data: { event_id: eventId, ticket_id: ticket?.id },
  })
}

async function updateOrderStatus(orderId: string, paymentId: string): Promise<void> {
  await supabase
    .from('orders')
    .update({
      status: 'paid',
      payment_id: paymentId,
    })
    .eq('id', orderId)

  // Get order items to update merchandise sold count
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('merchandise_id, quantity')
    .eq('order_id', orderId)

  if (orderItems) {
    for (const item of orderItems) {
      await supabase.rpc('increment', {
        table_name: 'merchandise',
        row_id: item.merchandise_id,
        column_name: 'sold_count',
      })
    }
  }
}
