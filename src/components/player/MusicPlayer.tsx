import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1,
  Shuffle,
  ListMusic,
  X,
  ChevronUp,
  ChevronDown,
  Download,
  Heart,
  Share2,
} from 'lucide-react'
import { usePlayerStore } from '@/store'
import { cn, formatDuration } from '@/utils'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { UserAvatar } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [localCurrentTime, setLocalCurrentTime] = useState(0)

  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffled,
    repeatMode,
    isMiniPlayer,
    queue,
    queueIndex,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setVolume,
    setIsMuted,
    toggleShuffle,
    toggleRepeat,
    playNext,
    playPrevious,
    setMiniPlayer,
  } = usePlayerStore()

  useEffect(() => {
    if (audioRef.current && currentSong) {
      audioRef.current.src = currentSong.audio_url
      if (isPlaying) {
        audioRef.current.play().catch(console.error)
      }
    }
  }, [currentSong])

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(console.error)
      } else {
        audioRef.current.pause()
      }
    }
  }, [isPlaying])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setLocalCurrentTime(audioRef.current.currentTime)
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleEnded = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        audioRef.current.play()
      }
    } else {
      playNext()
    }
  }

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0])
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  if (!currentSong) return null

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* Mini Player */}
      {!isMiniPlayer && (
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 border-t border-border bg-dark-gray/95 backdrop-blur supports-[backdrop-filter]:bg-dark-gray/80">
          {/* Progress Bar */}
          <Progress value={(currentTime / duration) * 100 || 0} className="h-1 rounded-none" />

          <div className="container flex items-center justify-between px-4 h-16">
            {/* Current Song */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <img
                src={currentSong.cover_url || currentSong.album?.cover_url || '/placeholder.jpg'}
                alt={currentSong.title}
                className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <Link
                  to={`/music/${currentSong.slug}`}
                  className="text-sm font-medium text-white hover:text-electric truncate block"
                >
                  {currentSong.title}
                </Link>
                <Link
                  to={`/artist/${currentSong.artist?.id}`}
                  className="text-xs text-gray-400 hover:text-electric truncate block"
                >
                  {currentSong.artist?.stage_name || 'Unknown Artist'}
                </Link>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 md:gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex"
                onClick={playPrevious}
              >
                <SkipBack className="h-5 w-5" />
              </Button>

              <Button
                variant="default"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex"
                onClick={playNext}
              >
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>

            {/* Time & Volume */}
            <div className="hidden md:flex items-center gap-4 flex-1 justify-end">
              <span className="text-xs text-gray-400">
                {formatDuration(currentTime)} / {formatDuration(duration)}
              </span>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleMute}>
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  className="w-20"
                />
              </div>

              <Button
                variant="ghost"
                size="icon"
                className={cn('h-8 w-8', isShuffled && 'text-electric')}
                onClick={toggleShuffle}
              >
                <Shuffle className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className={cn('h-8 w-8', repeatMode !== 'off' && 'text-electric')}
                onClick={toggleRepeat}
              >
                {repeatMode === 'one' ? (
                  <Repeat1 className="h-4 w-4" />
                ) : (
                  <Repeat className="h-4 w-4" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setMiniPlayer(true)}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>

            {/* Mobile Expand Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden ml-2"
              onClick={() => setMiniPlayer(true)}
            >
              <ChevronUp className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Expanded Player */}
      {isMiniPlayer && (
        <div className="fixed inset-0 z-50 bg-deep-black/98 backdrop-blur supports-[backdrop-filter]:bg-deep-black/98">
          {/* Background Image */}
          <div className="absolute inset-0 opacity-20">
            <img
              src={currentSong.cover_url || currentSong.album?.cover_url || '/placeholder.jpg'}
              alt=""
              className="w-full h-full object-cover blur-3xl"
            />
          </div>

          <div className="relative flex flex-col items-center justify-center h-full px-8 py-16">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4"
              onClick={() => setMiniPlayer(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Cover Art */}
            <img
              src={currentSong.cover_url || currentSong.album?.cover_url || '/placeholder.jpg'}
              alt={currentSong.title}
              className="w-72 h-72 rounded-2xl object-cover shadow-2xl mb-8"
            />

            {/* Song Info */}
            <div className="text-center mb-8 w-full max-w-md">
              <h2 className="text-2xl font-bold text-white mb-2">{currentSong.title}</h2>
              <Link
                to={`/artist/${currentSong.artist?.id}`}
                className="text-lg text-gray-400 hover:text-electric"
              >
                {currentSong.artist?.stage_name || 'Unknown Artist'}
              </Link>
            </div>

            {/* Progress */}
            <div className="w-full max-w-md mb-4">
              <Slider
                value={[localCurrentTime]}
                max={duration || 100}
                step={1}
                onValueChange={handleSeek}
                className="w-full"
              />
              <div className="flex justify-between mt-2 text-sm text-gray-400">
                <span>{formatDuration(localCurrentTime)}</span>
                <span>{formatDuration(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6 mb-8">
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-10 w-10', isShuffled && 'text-electric')}
                onClick={toggleShuffle}
              >
                <Shuffle className="h-5 w-5" />
              </Button>

              <Button variant="ghost" size="icon" className="h-12 w-12" onClick={playPrevious}>
                <SkipBack className="h-6 w-6" />
              </Button>

              <Button
                variant="default"
                size="icon"
                className="h-16 w-16 rounded-full"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <Pause className="h-8 w-8" />
                ) : (
                  <Play className="h-8 w-8 ml-1" />
                )}
              </Button>

              <Button variant="ghost" size="icon" className="h-12 w-12" onClick={playNext}>
                <SkipForward className="h-6 w-6" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className={cn('h-10 w-10', repeatMode !== 'off' && 'text-electric')}
                onClick={toggleRepeat}
              >
                {repeatMode === 'one' ? (
                  <Repeat1 className="h-5 w-5" />
                ) : (
                  <Repeat className="h-5 w-5" />
                )}
              </Button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-4 w-full max-w-md">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleMute}>
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="flex-1"
              />
            </div>

            {/* Collapse Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute bottom-8"
              onClick={() => setMiniPlayer(false)}
            >
              <ChevronDown className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
