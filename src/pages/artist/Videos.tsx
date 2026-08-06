import { useAuthStore } from '@/store'
import { useArtistVideos } from '@/hooks'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Play, Video } from 'lucide-react'

export default function ArtistVideos() {
  const { artist } = useAuthStore()
  const { data: videos, isLoading } = useArtistVideos(artist?.id || '')

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">My Videos</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Upload Video
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="aspect-video bg-mid-gray rounded-lg animate-pulse" />
          ))}
        </div>
      ) : videos && videos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => (
            <Card key={video.id} className="cursor-pointer hover:bg-mid-gray transition-colors">
              <div className="relative aspect-video bg-mid-gray rounded-t-lg flex items-center justify-center">
                <Play className="h-12 w-12 text-gray-600" />
              </div>
              <CardContent className="p-3">
                <h3 className="font-medium text-white truncate">{video.title}</h3>
                <p className="text-xs text-gray-400">{video.view_count} views</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Video className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No videos yet</h3>
          <p className="text-gray-400 mb-6">Upload your first music video</p>
          <Button>Upload Video</Button>
        </div>
      )}
    </div>
  )
}
