import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Play, Pause, Share2, Download, ThumbsUp, MessageCircle } from 'lucide-react'
import { useVideo } from '@/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { UserAvatar } from '@/components/ui/avatar'
import { formatDuration, formatNumber, formatDate } from '@/utils'
import { Link } from 'react-router-dom'

export default function VideoPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: video, isLoading, error } = useVideo(slug!)
  const [isPlaying, setIsPlaying] = useState(false)

  if (error) {
    return (
      <div className="container px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Video not found</h1>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container px-4 py-8">
        <Skeleton className="w-full aspect-video mb-8" />
        <Skeleton className="w-48 h-8 mb-4" />
        <Skeleton className="w-32 h-6" />
      </div>
    )
  }

  if (!video) return null

  return (
    <div className="min-h-screen">
      {/* Video Player */}
      <div className="relative bg-black">
        <div className="container px-4 py-8">
          <div className="relative aspect-video bg-dark-gray rounded-lg overflow-hidden">
            <video
              src={video.video_url}
              poster={video.thumbnail_url}
              controls
              className="w-full h-full"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>
        </div>
      </div>

      {/* Video Info */}
      <div className="container px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{video.title}</h1>
              <div className="flex items-center gap-4 text-gray-400">
                <span>{formatNumber(video.view_count)} views</span>
                <span>•</span>
                <span>{formatDate(video.created_at)}</span>
                <span>•</span>
                <span>{formatDuration(video.duration)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <ThumbsUp className="mr-2 h-4 w-4" />
                Like
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>

          {/* Artist Info */}
          <Card className="mb-8">
            <CardContent className="p-4 flex items-center gap-4">
              <Link to={`/artist/${video.artist?.id}`}>
                <UserAvatar
                  name={video.artist?.stage_name}
                  image={video.artist?.user?.avatar_url}
                  size="lg"
                />
              </Link>
              <div className="flex-1">
                <Link
                  to={`/artist/${video.artist?.id}`}
                  className="font-semibold text-white hover:text-electric"
                >
                  {video.artist?.stage_name || 'Unknown Artist'}
                </Link>
                {video.artist?.verified && (
                  <Badge variant="default" className="ml-2 text-xs">Verified</Badge>
                )}
                <p className="text-sm text-gray-400">
                  {formatNumber(video.artist?.total_followers || 0)} followers
                </p>
              </div>
              <Button>Follow</Button>
            </CardContent>
          </Card>

          {/* Description */}
          {video.description && (
            <Card className="mb-8">
              <CardContent className="p-4">
                <p className="text-gray-300 whitespace-pre-wrap">{video.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Comments Section Placeholder */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Comments
            </h2>
            <Card>
              <CardContent className="p-8 text-center text-gray-400">
                Comments are available after login
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
