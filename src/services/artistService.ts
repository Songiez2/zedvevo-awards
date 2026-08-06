// Artist Service - Manages artist subscriptions and uploads
import { supabase, isConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { ARTIST_PLANS } from '@/constants'
import { lipilaService } from './lipila'
import { generateId } from '@/utils'

export interface ArtistSubscription {
  id: string
  user_id: string
  plan: 'daily' | 'weekly' | 'annual'
  status: 'active' | 'expired' | 'cancelled' | 'pending'
  start_date: string
  end_date: string
  song_limit: number
  upload_count: number
  price: number
  currency: string
}

class ArtistService {
  // Check if user can upload (has active subscription)
  async canUpload(): Promise<boolean> {
    if (!isConfigured) {
      return false
    }

    const user = useAuthStore.getState().user
    if (!user) {
      return false
    }

    // Admins and super admins can always upload
    if (user.role === 'super_admin' || user.role === 'admin') {
      return true
    }

    // Check for active subscription
    const { data: subscription } = await supabase
      .from('artist_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString())
      .single()

    if (!subscription) {
      return false
    }

    // Check upload limit
    if (subscription.song_limit !== -1 && subscription.upload_count >= subscription.song_limit) {
      return false
    }

    return true
  }

  // Get user's active subscription
  async getActiveSubscription(): Promise<ArtistSubscription | null> {
    if (!isConfigured) {
      return null
    }

    const user = useAuthStore.getState().user
    if (!user) {
      return null
    }

    const { data } = await supabase
      .from('artist_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString())
      .single()

    return data
  }

  // Get all user's subscriptions
  async getSubscriptions(): Promise<ArtistSubscription[]> {
    if (!isConfigured) {
      return []
    }

    const user = useAuthStore.getState().user
    if (!user) {
      return []
    }

    const { data } = await supabase
      .from('artist_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    return data || []
  }

  // Subscribe to artist plan using Lipila
  async subscribeToPlan(
    planType: 'daily' | 'weekly' | 'annual',
    phoneNumber: string
  ): Promise<{ success: boolean; error?: string; paymentId?: string }> {
    if (!isConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    const user = useAuthStore.getState().user
    if (!user) {
      return { success: false, error: 'Please login first' }
    }

    const plan = ARTIST_PLANS[planType]
    if (!plan) {
      return { success: false, error: 'Invalid plan selected' }
    }

    try {
      // Create payment via Lipila
      const result = await lipilaService.subscribeArtist(planType, plan.price, phoneNumber)

      return result
    } catch (error: any) {
      console.error('Subscription error:', error)
      return { success: false, error: error.message || 'Failed to create subscription' }
    }
  }

  // Activate artist status after payment
  async activateArtist(): Promise<{ success: boolean; error?: string }> {
    if (!isConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    const user = useAuthStore.getState().user
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      // Update profile to artist
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          is_artist: true, 
          role: 'artist',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (profileError) {
        return { success: false, error: profileError.message }
      }

      // Create artist record if not exists
      const { data: existingArtist } = await supabase
        .from('artists')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!existingArtist) {
        await supabase.from('artists').insert({
          user_id: user.id,
          stage_name: user.full_name || user.username || 'Artist',
        })
      }

      // Refresh auth state
      await useAuthStore.getState().fetchUser()

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // Increment upload count
  async incrementUploadCount(subscriptionId: string): Promise<void> {
    if (!isConfigured) return

    await supabase.rpc('increment', {
      table_name: 'artist_subscriptions',
      row_id: subscriptionId,
      column_name: 'upload_count',
    })
  }

  // Get upload stats
  async getUploadStats(): Promise<{
    totalUploads: number
    limit: number
    remaining: number
    daysLeft: number
  }> {
    if (!isConfigured) {
      return { totalUploads: 0, limit: 0, remaining: 0, daysLeft: 0 }
    }

    const user = useAuthStore.getState().user
    if (!user) {
      return { totalUploads: 0, limit: 0, remaining: 0, daysLeft: 0 }
    }

    const subscription = await this.getActiveSubscription()
    if (!subscription) {
      return { totalUploads: 0, limit: 0, remaining: 0, daysLeft: 0 }
    }

    const endDate = new Date(subscription.end_date)
    const now = new Date()
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return {
      totalUploads: subscription.upload_count,
      limit: subscription.song_limit,
      remaining: subscription.song_limit === -1 ? -1 : subscription.song_limit - subscription.upload_count,
      daysLeft: Math.max(0, daysLeft),
    }
  }

  // Upload song
  async uploadSong(songData: {
    title: string
    description?: string
    audioFile: File
    coverImage?: File
    genre?: string
    price?: number
    isFree?: boolean
  }): Promise<{ success: boolean; error?: string; songId?: string }> {
    if (!isConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    // Check upload permission
    const canUpload = await this.canUpload()
    if (!canUpload) {
      return { success: false, error: 'Please subscribe to an artist plan to upload songs' }
    }

    const user = useAuthStore.getState().user
    const artist = useAuthStore.getState().artist
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const subscription = await this.getActiveSubscription()

    try {
      const songId = generateId()

      // Upload audio file
      const audioPath = `songs/${user.id}/${songId}/${songData.audioFile.name}`
      const { error: audioError } = await supabase.storage
        .from('music')
        .upload(audioPath, songData.audioFile)

      if (audioError) {
        return { success: false, error: 'Failed to upload audio file' }
      }

      const { data: audioUrl } = supabase.storage.from('music').getPublicUrl(audioPath)

      // Upload cover image if provided
      let coverUrl = null
      if (songData.coverImage) {
        const coverPath = `covers/${user.id}/${songId}/${songData.coverImage.name}`
        await supabase.storage.from('albums').upload(coverPath, songData.coverImage)
        const { data: url } = supabase.storage.from('albums').getPublicUrl(coverPath)
        coverUrl = url.publicUrl
      }

      // Create song record
      const { error: songError } = await supabase.from('songs').insert({
        id: songId,
        title: songData.title,
        description: songData.description,
        artist_id: artist?.id,
        cover_url: coverUrl,
        audio_url: audioUrl.publicUrl,
        duration: 0, // Will be updated by audio analysis
        genre: songData.genre,
        price: songData.isFree ? 0 : songData.price || 0,
        is_free: songData.isFree !== false,
        status: 'active',
      })

      if (songError) {
        // Clean up uploaded files
        await supabase.storage.from('music').remove([audioPath])
        return { success: false, error: songError.message }
      }

      // Increment upload count
      if (subscription) {
        await this.incrementUploadCount(subscription.id)
      }

      // Refresh auth state
      await useAuthStore.getState().fetchUser()

      return { success: true, songId }
    } catch (error: any) {
      console.error('Upload error:', error)
      return { success: false, error: error.message }
    }
  }

  // Upload video
  async uploadVideo(videoData: {
    title: string
    description?: string
    videoFile: File
    thumbnail?: File
    price?: number
    isFree?: boolean
  }): Promise<{ success: boolean; error?: string; videoId?: string }> {
    if (!isConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    const canUpload = await this.canUpload()
    if (!canUpload) {
      return { success: false, error: 'Please subscribe to an artist plan to upload videos' }
    }

    const user = useAuthStore.getState().user
    const artist = useAuthStore.getState().artist
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const videoId = generateId()

      // Upload video file
      const videoPath = `videos/${user.id}/${videoId}/${videoData.videoFile.name}`
      const { error: videoError } = await supabase.storage
        .from('videos')
        .upload(videoPath, videoData.videoFile)

      if (videoError) {
        return { success: false, error: 'Failed to upload video file' }
      }

      const { data: videoUrl } = supabase.storage.from('videos').getPublicUrl(videoPath)

      // Upload thumbnail if provided
      let thumbnailUrl = null
      if (videoData.thumbnail) {
        const thumbPath = `thumbnails/${user.id}/${videoId}/${videoData.thumbnail.name}`
        await supabase.storage.from('images').upload(thumbPath, videoData.thumbnail)
        const { data: url } = supabase.storage.from('images').getPublicUrl(thumbPath)
        thumbnailUrl = url.publicUrl
      }

      // Create video record
      const { error } = await supabase.from('videos').insert({
        id: videoId,
        title: videoData.title,
        description: videoData.description,
        artist_id: artist?.id,
        thumbnail_url: thumbnailUrl,
        video_url: videoUrl.publicUrl,
        price: videoData.isFree ? 0 : videoData.price || 0,
        is_free: videoData.isFree !== false,
        status: 'active',
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, videoId }
    } catch (error: any) {
      console.error('Video upload error:', error)
      return { success: false, error: error.message }
    }
  }

  // Create album
  async createAlbum(albumData: {
    title: string
    description?: string
    coverImage: File
    genre?: string
    price?: number
    isFree?: boolean
  }): Promise<{ success: boolean; error?: string; albumId?: string }> {
    if (!isConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    const canUpload = await this.canUpload()
    if (!canUpload) {
      return { success: false, error: 'Please subscribe to an artist plan to create albums' }
    }

    const user = useAuthStore.getState().user
    const artist = useAuthStore.getState().artist
    if (!user || !artist) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const albumId = generateId()

      // Upload cover image
      const coverPath = `covers/${user.id}/${albumId}/${albumData.coverImage.name}`
      const { error: coverError } = await supabase.storage
        .from('albums')
        .upload(coverPath, albumData.coverImage)

      if (coverError) {
        return { success: false, error: 'Failed to upload cover image' }
      }

      const { data: coverUrl } = supabase.storage.from('albums').getPublicUrl(coverPath)

      // Create album record
      const { error } = await supabase.from('albums').insert({
        id: albumId,
        title: albumData.title,
        artist_id: artist.id,
        cover_url: coverUrl.publicUrl,
        description: albumData.description,
        genre: albumData.genre,
        price: albumData.isFree ? 0 : albumData.price || 0,
        is_free: albumData.isFree !== false,
        status: 'active',
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, albumId }
    } catch (error: any) {
      console.error('Album creation error:', error)
      return { success: false, error: error.message }
    }
  }
}

export const artistService = new ArtistService()
export default artistService
