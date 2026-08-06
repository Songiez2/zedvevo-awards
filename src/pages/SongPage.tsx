import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Play, Pause, Heart, Share2, Download, MoreHorizontal, Clock, User } from 'lucide-react'
import { useSong, useArtistSongs, useFavoriteSong } from '@/hooks'
import { usePlayerStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { UserAvatar } from '@/components/ui/avatar'
import { formatDuration, formatNumber, formatDate } from '@/utils'
import { useToast } from '@/components/ui/use-toast'

export default function SongPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: song, isLoading, error } = useSong(slug!)
  const { data: relatedSongs } = useArtistSongs(song?.artist_id || '')
  const { playSong, currentSong, isPlaying, setIsPlaying } = usePlayerStore()
  const { toast } = useToast()
  const isFavorite = false

  const handlePlay = () => {
    if (currentSong?.id === song?.id) {
      setIsPlaying(!isPlaying)
    } else if (song) {
      playSong(song, relatedSongs || [])
    }
  }

  const handleFavorite = async () => {
    toast({
      title: 'Demo Mode',
      description: 'Connect Supabase to enable favorites',
      variant: 'default',
    })
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: song?.title,
        text: `Listen to ${song?.title} by ${song?.artist?.stage_name}`,
        url: window.location.href,
      })
    } else {
      await navigator.clipboard.writeText(window.location.href)
      toast({ title: 'Link copied to clipboard' })
    }
  }

  if (error) {
    return (
      <div className="container px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Song not found</h1>
        <Link to="/music">
          <Button>Back to Music</Button>
        </Link>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container px-4 py-8">
        <div className="flex gap-8">
          <Skeleton className="w-64 h-64" />
          <div className="flex-1">
            <Skeleton className="w-48 h-8 mb-4" />
            <Skeleton className="w-32 h-6 mb-2" />
            <Skeleton className="w-64 h-4" />
          </div>
        </div>
      </div>
    )
  }

  if (!song) return null

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative bg-gradient-to-b from-electric-blue/20 to-transparent py-12">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row gap-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-48 h-48 md:w-64 md:h-64 flex-shrink-0 mx-auto md:mx-0"
            >
              <img
                src={song.cover_url || '/placeholder.jpg'}
                alt={song.title}
                className="w-full h-full object-cover rounded-lg shadow-2xl"
              />
              {song.access === 'premium' && (
                <Badge variant="premium" className="absolute top-4 right-4">
                  Premium
                </Badge>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 text-center md:text-left"
            >
              <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">Song</p>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{song.title}</h1>
              
              <Link to={`/artist/${song.artist?.id}`} className="flex items-center gap-3 justify-center md:justify-start mb-6">
                <UserAvatar
                  name={song.artist?.stage_name}
                  image={song.artist?.user?.avatar_url}
                  size="md"
                />
                <div>
                  <p className="font-semibold text-white hover:text-electric">
                    {song.artist?.stage_name || 'Unknown Artist'}
                  </p>
                  {song.artist?.verified && (
                    <Badge variant="default" className="text-xs">Verified</Badge>
                  )}
                </div>
              </Link>

              {song.album && (
                <Link
                  to={`/album/${song.album.slug}`}
                  className="text-gray-400 hover:text-electric mb-4 block"
                >
                  Album: {song.album.title}
                </Link>
              )}

              <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-gray-400 mb-6">
                <span>{formatNumber(song.play_count)} plays</span>
                <span>•</span>
                <span>{formatDuration(song.duration)}</span>
                <span>•</span>
                <span>{formatDate(song.created_at)}</span>
              </div>

              <div className="flex items-center justify-center md:justify-start gap-3">
                <Button onClick={handlePlay} size="lg">
                  {currentSong?.id === song.id && isPlaying ? (
                    <>
                      <Pause className="mr-2 h-5 w-5" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-5 w-5" /> Play
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleFavorite}>
                  <Heart className={`mr-2 h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                  {isFavorite ? 'Liked' : 'Like'}
                </Button>
                <Button variant="outline" onClick={handleShare}>
                  <Share2 className="mr-2 h-5 w-5" />
                  Share
                </Button>
                <Button variant="outline">
                  <Download className="mr-2 h-5 w-5" />
                  Download
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container px-4 py-8">
        {/* Lyrics */}
        {song.lyrics && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Lyrics</h2>
            <Card>
              <CardContent className="p-6">
                <pre className="whitespace-pre-wrap text-gray-300 font-sans">
                  {song.lyrics}
                </pre>
              </CardContent>
            </Card>
          </section>
        )}

        {/* More from Artist */}
        {relatedSongs && relatedSongs.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">More from {song.artist?.stage_name}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {relatedSongs.filter(s => s.id !== song.id).slice(0, 5).map((s) => (
                <Card
                  key={s.id}
                  className="group cursor-pointer"
                  onClick={() => playSong(s, relatedSongs || [])}
                >
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={s.cover_url || '/placeholder.jpg'}
                      alt={s.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                      <Play className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-white truncate text-sm">{s.title}</h3>
                    <p className="text-xs text-gray-400">{formatDuration(s.duration)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
