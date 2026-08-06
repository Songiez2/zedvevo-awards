// Storage Service
import { supabase, isConfigured } from '@/lib/supabase'

class StorageService {
  async uploadFile(bucket: string, path: string, file: File): Promise<{ success: boolean; url?: string; error?: string }> {
    if (!isConfigured) return { success: false, error: 'Supabase not configured' }
    try {
      const { error } = await supabase.storage.from(bucket).upload(path, file)
      if (error) return { success: false, error: error.message }
      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      return { success: true, url: data.publicUrl }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    if (!isConfigured) return
    await supabase.storage.from(bucket).remove([path])
  }

  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  async uploadProfilePicture(file: File, userId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    const path = `profiles/${userId}/${Date.now()}_${file.name}`
    return this.uploadFile('profiles', path, file)
  }

  async uploadMusicFile(file: File, userId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    const path = `music/${userId}/${Date.now()}_${file.name}`
    return this.uploadFile('music', path, file)
  }

  async uploadSongCover(file: File, userId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    const path = `covers/${userId}/${Date.now()}_${file.name}`
    return this.uploadFile('albums', path, file)
  }

  async uploadVideoFile(file: File, userId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    const path = `videos/${userId}/${Date.now()}_${file.name}`
    return this.uploadFile('videos', path, file)
  }

  async uploadHeroImage(file: File): Promise<{ success: boolean; url?: string; error?: string }> {
    const path = `hero/${Date.now()}_${file.name}`
    return this.uploadFile('hero', path, file)
  }

  async uploadProductImage(file: File, productId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    const path = `products/${productId}/${Date.now()}_${file.name}`
    return this.uploadFile('products', path, file)
  }

  async uploadTicketBanner(file: File, eventId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    const path = `tickets/${eventId}/${Date.now()}_${file.name}`
    return this.uploadFile('tickets', path, file)
  }
}

export const storageService = new StorageService()
export default storageService
