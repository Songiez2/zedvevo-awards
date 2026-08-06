import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload as UploadIcon, Music, Image as ImageIcon } from 'lucide-react'
import { useAuthStore } from '@/store'
import { useCreateSong, useCategories } from '@/hooks'
import { storageService } from '@/services'
import { slugify } from '@/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'

const uploadSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  genre_id: z.string().optional(),
  price: z.number().min(0).optional(),
  access: z.enum(['free', 'premium']),
})

type UploadForm = z.infer<typeof uploadSchema>

export default function ArtistUpload() {
  const navigate = useNavigate()
  const { artist } = useAuthStore()
  const { toast } = useToast()
  const createSong = useCreateSong()
  const { data: categories } = useCategories()

  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [audioPreview, setAudioPreview] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UploadForm>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      access: 'free',
      price: 0,
    },
  })

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAudioFile(file)
      setAudioPreview(URL.createObjectURL(file))
    }
  }

  const onSubmit = async (data: UploadForm) => {
    if (!audioFile) {
      toast({ title: 'Please upload an audio file', variant: 'destructive' })
      return
    }

    if (!artist) {
      toast({ title: 'You must be an artist to upload', variant: 'destructive' })
      return
    }

    setIsUploading(true)
    try {
      // Upload audio
      const audioResult = await storageService.uploadMusicFile(audioFile, artist.id)
      if (audioResult.error) throw new Error(audioResult.error)

      // Upload cover if provided
      let coverUrl = ''
      if (coverFile) {
        const coverResult = await storageService.uploadSongCover(coverFile, 'temp')
        if (coverResult.error) throw new Error(coverResult.error)
        coverUrl = coverResult.url
      }

      // Create song record
      await createSong.mutateAsync({
        artist_id: artist.id,
        title: data.title,
        slug: slugify(data.title),
        description: data.description,
        audio_url: audioResult.url,
        cover_url: coverUrl || undefined,
        genre_id: data.genre_id || null,
        price: data.price || 0,
        access: data.access,
        duration: 0, // Would be calculated from audio metadata
      })

      toast({ title: 'Song uploaded successfully!' })
      navigate('/artist/songs')
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Upload Song</CardTitle>
            <CardDescription>Share your music with the world</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Audio Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Audio File *</label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-electric transition-colors">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioChange}
                    className="hidden"
                    id="audio-upload"
                  />
                  <label htmlFor="audio-upload" className="cursor-pointer">
                    {audioFile ? (
                      <div>
                        <Music className="h-12 w-12 text-electric mx-auto mb-2" />
                        <p className="text-white font-medium">{audioFile.name}</p>
                        <p className="text-sm text-gray-400">{formatFileSize(audioFile.size)}</p>
                      </div>
                    ) : (
                      <div>
                        <UploadIcon className="h-12 w-12 text-gray-500 mx-auto mb-2" />
                        <p className="text-white font-medium">Click to upload audio</p>
                        <p className="text-sm text-gray-400">MP3, WAV, OGG up to 50MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Cover Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Cover Image</label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-electric transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="cover-upload"
                  />
                  <label htmlFor="cover-upload" className="cursor-pointer">
                    {coverFile ? (
                      <img
                        src={URL.createObjectURL(coverFile)}
                        alt="Cover"
                        className="w-32 h-32 object-cover rounded-lg mx-auto"
                      />
                    ) : (
                      <div>
                        <ImageIcon className="h-12 w-12 text-gray-500 mx-auto mb-2" />
                        <p className="text-white font-medium">Click to upload cover</p>
                        <p className="text-sm text-gray-400">JPG, PNG up to 5MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Title */}
              <Input
                label="Title *"
                {...register('title')}
                error={errors.title?.message}
                placeholder="Enter song title"
              />

              {/* Description */}
              <Textarea
                label="Description"
                {...register('description')}
                placeholder="Tell us about this song..."
              />

              {/* Genre */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Genre</label>
                <Select onValueChange={(v) => setValue('genre_id', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Access */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Access</label>
                <Select
                  defaultValue="free"
                  onValueChange={(v) => setValue('access', v as 'free' | 'premium')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free - Available to all users</SelectItem>
                    <SelectItem value="premium">Premium - Paid content</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price */}
              {watch('access') === 'premium' && (
                <Input
                  label="Price (ZMW)"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('price', { valueAsNumber: true })}
                  error={errors.price?.message}
                />
              )}

              <Button type="submit" className="w-full" isLoading={isUploading}>
                <UploadIcon className="mr-2 h-4 w-4" />
                Upload Song
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
