import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { useArtistAlbums } from '@/hooks'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Disc } from 'lucide-react'

export default function ArtistAlbums() {
  const { artist } = useAuthStore()
  const { data: albums, isLoading } = useArtistAlbums(artist?.id || '')

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">My Albums</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Album
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="aspect-square bg-mid-gray rounded-lg animate-pulse" />
          ))}
        </div>
      ) : albums && albums.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {albums.map((album) => (
            <Card key={album.id} className="cursor-pointer hover:bg-mid-gray transition-colors">
              <div className="aspect-square bg-mid-gray rounded-t-lg flex items-center justify-center">
                <Disc className="h-12 w-12 text-gray-600" />
              </div>
              <CardContent className="p-3">
                <h3 className="font-medium text-white truncate">{album.title}</h3>
                <p className="text-xs text-gray-400">{album.track_count} tracks</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Disc className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No albums yet</h3>
          <p className="text-gray-400 mb-6">Create your first album to organize your music</p>
          <Button>Create Album</Button>
        </div>
      )}
    </div>
  )
}
