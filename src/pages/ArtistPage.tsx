import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Play, UserPlus, MoreHorizontal, Music, Disc, Video } from 'lucide-react'
import { useArtist, useArtistSongs, useArtistAlbums, useArtistVideos, useFollowArtist, useUnfollowArtist } from '@/hooks'
import { usePlayerStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserAvatar } from '@/components/ui/avatar'
import { formatNumber } from '@/utils'

export default function ArtistPage() {
  const { id } = useParams<{ id: string }>()
  const { data: artist, isLoading } = useArtist(id!)
  const { data: songs } = useArtistSongs(id!)
  const { data: albums } = useArtistAlbums(id!)
  const { data: videos } = useArtistVideos(id!)
  const followArtist = useFollowArtist()
  const unfollowArtist = useUnfollowArtist()
  const { playSong, currentSong, isPlaying } = usePlayerStore()

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="h-80 bg-gradient-to-b from-electric-blue/20" />
        <div className="container px-4 py-8">
          <Skeleton className="w-48 h-12 mb-4" />
          <Skeleton className="w-32 h-6 mb-8" />
          <Skeleton className="w-full h-64" />
        </div>
      </div>
    )
  }

  if (!artist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-2xl font-bold text-white">Artist not found</h1>
      </div>
    )
  }

  const handleFollow = () => {
    if (artist) {
      followArtist.mutate(artist.id)
    }
  }

  const handleUnfollow = () => {
    if (artist) {
      unfollowArtist.mutate(artist.id)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="relative h-80 bg-gradient-to-b from-electric-blue/20 to-transparent">
        <div className="absolute inset-0 bg-gradient-to-t from-deep-black via-transparent to-transparent" />
        <div className="container px-4 absolute bottom-0 left-0 right-0 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-end gap-6"
          >
            <UserAvatar
              name={artist.stage_name}
              image={artist.user?.avatar_url}
              size="xl"
              className="w-40 h-40 border-4 border-white"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-4xl md:text-5xl font-bold text-white">
                  {artist.stage_name}
                </h1>
                {artist.verified && (
                  <Badge variant="default" className="text-lg">✓</Badge>
                )}
              </div>
              <div className="flex items-center gap-6 text-gray-400">
                <span>{formatNumber(artist.total_followers)} followers</span>
                <span>{formatNumber(artist.monthly_listeners)} monthly listeners</span>
                <span>{formatNumber(artist.total_streams)} total streams</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleFollow} className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Follow
              </Button>
              <Button variant="outline">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="container px-4 py-8">
        {/* Popular Songs */}
        {songs && songs.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Popular Songs</h2>
            <div className="grid gap-2">
              {songs.slice(0, 5).map((song, index) => (
                <Card
                  key={song.id}
                  className={`group cursor-pointer hover:bg-mid-gray transition-colors ${
                    currentSong?.id === song.id ? 'bg-mid-gray' : ''
                  }`}
                  onClick={() => playSong(song, songs)}
                >
                  <CardContent className="p-3 flex items-center gap-4">
                    <span className="text-lg font-bold text-gray-600 w-6 text-center">
                      {index + 1}
                    </span>
                    <img
                      src={song.cover_url || '/placeholder.jpg'}
                      alt=""
                      className="w-12 h-12 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium truncate ${currentSong?.id === song.id ? 'text-electric' : 'text-white'}`}>
                        {song.title}
                      </h3>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatNumber(song.play_count)} plays
                    </span>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                      <Play className="h-5 w-5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Tabs */}
        <Tabs defaultValue="songs">
          <TabsList className="mb-6">
            <TabsTrigger value="songs">
              <Music className="h-4 w-4 mr-2" />
              Songs
            </TabsTrigger>
            <TabsTrigger value="albums">
              <Disc className="h-4 w-4 mr-2" />
              Albums
            </TabsTrigger>
            <TabsTrigger value="videos">
              <Video className="h-4 w-4 mr-2" />
              Videos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="songs">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {songs?.map((song) => (
                <Card
                  key={song.id}
                  className="group cursor-pointer"
                  onClick={() => playSong(song, songs)}
                >
                  <div className="relative aspect-square">
                    <img
                      src={song.cover_url || '/placeholder.jpg'}
                      alt=""
                      className="w-full h-full object-cover rounded-t-lg"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-t-lg">
                      <Play className="h-10 w-10 text-white" />
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-white truncate text-sm">{song.title}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="albums">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {albums?.map((album) => (
                <Link key={album.id} to={`/album/${album.slug}`}>
                  <Card className="group cursor-pointer">
                    <div className="relative aspect-square">
                      <img
                        src={album.cover_url || '/placeholder.jpg'}
                        alt=""
                        className="w-full h-full object-cover rounded-t-lg"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-t-lg">
                        <Play className="h-10 w-10 text-white" />
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-medium text-white truncate text-sm">{album.title}</h3>
                      <p className="text-xs text-gray-400">{album.track_count} tracks</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="videos">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos?.map((video) => (
                <Link key={video.id} to={`/video/${video.slug}`}>
                  <Card className="group cursor-pointer">
                    <div className="relative aspect-video">
                      <img
                        src={video.thumbnail_url || '/placeholder-video.jpg'}
                        alt=""
                        className="w-full h-full object-cover rounded-t-lg"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-t-lg">
                        <Play className="h-12 w-12 text-white" />
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-medium text-white truncate">{video.title}</h3>
                      <p className="text-xs text-gray-400">
                        {formatNumber(video.view_count)} views
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
