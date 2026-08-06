import { supabase } from '@/lib/supabase'
import { STORAGE_BUCKETS } from '@/constants'
import { generateId } from '@/utils'

export type StorageBucket = keyof typeof STORAGE_BUCKETS

interface UploadOptions {
  bucket: StorageBucket
  path?: string
  fileName?: string
  contentType?: string
}

interface UploadResult {
  path: string
  url: string
  error?: never
}

interface UploadError {
  path?: never
  url?: never
  error: string
}

export const storageService = {
  async uploadFile(
    file: File | Blob,
    options: UploadOptions
  ): Promise<UploadResult | UploadError> {
    const bucketName = STORAGE_BUCKETS[options.bucket]
    const fileName = options.fileName || `${generateId()}-${(file as File).name?.replace(/[^a-zA-Z0-9.-]/g, '_') || 'file'}`
    const path = options.path ? `${options.path}/${fileName}` : fileName

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(path, file, {
        contentType: options.contentType || (file as File).type || 'application/octet-stream',
        upsert: true,
      })

    if (error) {
      console.error('Storage upload error:', error)
      return { error: error.message }
    }

    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(data.path)

    return {
      path: data.path,
      url: urlData.publicUrl,
    }
  },

  async deleteFile(bucket: StorageBucket, path: string): Promise<boolean> {
    const { error } = await supabase.storage.from(STORAGE_BUCKETS[bucket]).remove([path])

    if (error) {
      console.error('Storage delete error:', error)
      return false
    }

    return true
  },

  async getSignedUrl(bucket: StorageBucket, path: string): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS[bucket])
      .createSignedUrl(path, 3600)

    if (error) {
      console.error('Storage signed URL error:', error)
      return null
    }

    return data.signedUrl
  },

  async listFiles(bucket: StorageBucket, path?: string): Promise<string[]> {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS[bucket])
      .list(path || '', { limit: 100 })

    if (error) {
      console.error('Storage list error:', error)
      return []
    }

    return data?.map((f) => f.name) || []
  },

  async uploadProfilePicture(file: File, userId: string): Promise<UploadResult | UploadError> {
    const ext = file.name.split('.').pop()
    return this.uploadFile(file, {
      bucket: 'profiles',
      path: userId,
      fileName: `avatar.${ext}`,
      contentType: file.type,
    })
  },

  async uploadArtistCover(file: File, artistId: string): Promise<UploadResult | UploadError> {
    const ext = file.name.split('.').pop()
    return this.uploadFile(file, {
      bucket: 'artists',
      path: artistId,
      fileName: `cover.${ext}`,
      contentType: file.type,
    })
  },

  async uploadAlbumCover(file: File, albumId: string): Promise<UploadResult | UploadError> {
    const ext = file.name.split('.').pop()
    return this.uploadFile(file, {
      bucket: 'albums',
      path: albumId,
      fileName: `cover.${ext}`,
      contentType: file.type,
    })
  },

  async uploadSongCover(file: File, songId: string): Promise<UploadResult | UploadError> {
    const ext = file.name.split('.').pop()
    return this.uploadFile(file, {
      bucket: 'albums',
      path: songId,
      fileName: `cover.${ext}`,
      contentType: file.type,
    })
  },

  async uploadHeroImage(file: File): Promise<UploadResult | UploadError> {
    const ext = file.name.split('.').pop()
    const fileName = `hero-${generateId()}.${ext}`
    return this.uploadFile(file, {
      bucket: 'hero',
      fileName,
      contentType: file.type,
    })
  },

  async uploadMusicFile(file: File, artistId: string): Promise<UploadResult | UploadError> {
    const ext = file.name.split('.').pop()
    const fileName = `${generateId()}.${ext}`
    return this.uploadFile(file, {
      bucket: 'music',
      path: artistId,
      fileName,
      contentType: file.type,
    })
  },

  async uploadVideoFile(file: File, artistId: string): Promise<UploadResult | UploadError> {
    const ext = file.name.split('.').pop()
    const fileName = `${generateId()}.${ext}`
    return this.uploadFile(file, {
      bucket: 'videos',
      path: artistId,
      fileName,
      contentType: file.type,
    })
  },

  async uploadMerchandiseImage(file: File, merchandiseId: string, index: number): Promise<UploadResult | UploadError> {
    const ext = file.name.split('.').pop()
    const fileName = `${index}.${ext}`
    return this.uploadFile(file, {
      bucket: 'products',
      path: merchandiseId,
      fileName,
      contentType: file.type,
    })
  },

  async uploadTicketQRCode(ticketId: string, qrDataUrl: string): Promise<UploadResult | UploadError> {
    const response = await fetch(qrDataUrl)
    const blob = await response.blob()
    return this.uploadFile(blob, {
      bucket: 'tickets',
      fileName: `${ticketId}.png`,
      contentType: 'image/png',
    })
  },
}
