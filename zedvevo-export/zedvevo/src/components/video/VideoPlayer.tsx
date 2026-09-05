import { useEffect, useRef, useCallback, useState } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  Video as VideoIcon, Loader2, Share2, ThumbsUp, BookmarkPlus, Gauge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { Video } from '@/types/index';
import { incrementViewCount, toggleLike, toggleSave } from '@/lib/api';
import { formatDuration } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import ShareSheet from '@/components/common/ShareSheet';

interface VideoPlayerProps {
  video: Video;
  onClose?: () => void;
}

const SPEED_OPTIONS = [0.5, 1, 1.5, 2] as const;
type SpeedOption = typeof SPEED_OPTIONS[number];

export default function VideoPlayer({ video, onClose }: VideoPlayerProps) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<SpeedOption>(1);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(video.liked ?? false);
  const [saved, setSaved] = useState(video.saved ?? false);
  const [shareOpen, setShareOpen] = useState(false);
  const countedRef = useRef(false);

  const shareUrl = `${window.location.origin}/videos?id=${video.id}`;
  const shareText = `Watch "${video.title}" by ${video.artist_name} on ZedVevo — ${window.location.origin}/videos?id=${video.id}`;

  // Reset when video changes
  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    countedRef.current = false;
    videoRef.current?.load();
  }, [video.id, video.file_url]);

  // Sync playback rate to the video element whenever it changes
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = playbackRate;
  }, [playbackRate]);

  // Also re-apply rate after video loads (load() resets playbackRate to 1)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const reapplyRate = () => { v.playbackRate = playbackRate; };
    v.addEventListener('loadedmetadata', reapplyRate);
    v.addEventListener('canplay', reapplyRate);
    return () => {
      v.removeEventListener('loadedmetadata', reapplyRate);
      v.removeEventListener('canplay', reapplyRate);
    };
  }, [playbackRate]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime     = () => setCurrentTime(v.currentTime);
    const onLoad     = () => { setDuration(v.duration); setBuffering(false); v.playbackRate = playbackRate; };
    const onEnded    = () => setPlaying(false);
    const onWaiting  = () => setBuffering(true);
    const onCanPlay  = () => { setBuffering(false); v.playbackRate = playbackRate; };
    const onError    = () => { setError('Unable to play this video.'); setPlaying(false); };
    const onProgress = () => {
      if (v.currentTime >= 10 && !countedRef.current) {
        countedRef.current = true;
        incrementViewCount(video.id).catch(() => {});
      }
    };
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);

    v.addEventListener('timeupdate',     onTime);
    v.addEventListener('timeupdate',     onProgress);
    v.addEventListener('loadedmetadata', onLoad);
    v.addEventListener('ended',          onEnded);
    v.addEventListener('waiting',        onWaiting);
    v.addEventListener('canplay',        onCanPlay);
    v.addEventListener('error',          onError);
    document.addEventListener('fullscreenchange', onFsChange);

    return () => {
      v.removeEventListener('timeupdate',     onTime);
      v.removeEventListener('timeupdate',     onProgress);
      v.removeEventListener('loadedmetadata', onLoad);
      v.removeEventListener('ended',          onEnded);
      v.removeEventListener('waiting',        onWaiting);
      v.removeEventListener('canplay',        onCanPlay);
      v.removeEventListener('error',          onError);
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, [video.id, playbackRate]);

  const togglePlay = useCallback(async () => {
    const v = videoRef.current;
    if (!v || error) return;
    if (playing) {
      v.pause(); setPlaying(false);
    } else {
      try {
        setBuffering(true);
        v.playbackRate = playbackRate;
        await v.play();
        setPlaying(true);
      } catch {
        setError('Playback failed. Try again or check your connection.');
        setBuffering(false);
      }
    }
  }, [playing, error, playbackRate]);

  // Auto-hide controls
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (playing) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [playing]);

  useEffect(() => {
    if (!playing) setShowControls(true);
  }, [playing]);

  const seek = (val: number[]) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = val[0];
    setCurrentTime(val[0]);
  };

  const handleVolume = (val: number[]) => {
    const v = videoRef.current;
    if (!v) return;
    const vol = val[0] / 100;
    v.volume = vol;
    setVolume(vol);
    setMuted(vol === 0);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !muted;
    setMuted(!muted);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleSpeedSelect = (speed: SpeedOption) => {
    setPlaybackRate(speed);
    const v = videoRef.current;
    if (v) v.playbackRate = speed;
    setShowSpeedMenu(false);
  };

  const handleLike = async () => {
    if (!user) { toast.error('Sign in to like videos'); return; }
    try {
      const result = await toggleLike(user.id, video.id, 'video');
      setLiked(result);
      toast.success(result ? 'Liked!' : 'Removed from liked');
    } catch { toast.error('Failed to update'); }
  };

  const handleSave = async () => {
    if (!user) { toast.error('Sign in to save videos'); return; }
    try {
      const result = await toggleSave(user.id, video.id, 'video');
      setSaved(result);
      toast.success(result ? 'Saved to library' : 'Removed from library');
    } catch { toast.error('Failed to update'); }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      if (e.key === 'f') toggleFullscreen();
      if (e.key === 'm') toggleMute();
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, onClose]);

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full bg-black">
      {/* ── Video area ── */}
      <div
        ref={containerRef}
        className="relative w-full aspect-video bg-black group"
        onMouseMove={showControlsTemporarily}
        onMouseLeave={() => { if (playing) setShowControls(false); setShowSpeedMenu(false); }}
      >
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70">
            <VideoIcon className="h-12 w-12 opacity-30" />
            <p className="text-sm text-center px-4">{error}</p>
            <Button
              size="sm"
              variant="ghost"
              className="border border-white/30 text-white hover:bg-white/10"
              onClick={() => { setError(null); videoRef.current?.load(); }}
            >
              Retry
            </Button>
          </div>
        ) : (
          <>
            {/* Video element — clicking video surface toggles play */}
            <video
              ref={videoRef}
              src={video.file_url}
              poster={video.thumbnail_url ?? undefined}
              className="w-full h-full object-contain cursor-pointer"
              muted={muted}
              playsInline
              preload="auto"
              crossOrigin="anonymous"
              onClick={togglePlay}
            />

            {/* Buffering spinner */}
            {buffering && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Loader2 className="h-12 w-12 text-white/80 animate-spin" />
              </div>
            )}

            {/* Centre play button — clickable, sits above video */}
            {!playing && !buffering && (
              <div
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
                onClick={togglePlay}
              >
                <div className="w-20 h-20 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
                  <Play className="h-9 w-9 text-white fill-white ml-1" />
                </div>
              </div>
            )}

            {/* Controls overlay — auto-hides when playing, stops propagation to video */}
            <div
              className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              onClick={e => e.stopPropagation()}
            >
              {/* Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none rounded-b" />

              <div className="relative px-3 pb-3 pt-8">
                {/* Progress bar */}
                <div className="mb-2">
                  <Slider
                    value={[currentTime]}
                    min={0}
                    max={duration || 100}
                    step={0.5}
                    onValueChange={seek}
                    className="w-full [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:bg-white [&>span:first-child]:h-1 [&>span:first-child>span]:bg-white [&>span:first-child]:bg-white/30"
                  />
                </div>

                <div className="flex items-center justify-between">
                  {/* Left controls */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-white hover:bg-white/10"
                      onClick={togglePlay}
                    >
                      {playing
                        ? <Pause className="h-4 w-4 fill-white text-white" />
                        : <Play className="h-4 w-4 fill-white text-white" />}
                    </Button>

                    {/* Volume */}
                    <div className="flex items-center gap-1 group/vol">
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-white hover:bg-white/10"
                        onClick={toggleMute}
                      >
                        {muted || volume === 0
                          ? <VolumeX className="h-4 w-4" />
                          : <Volume2 className="h-4 w-4" />}
                      </Button>
                      <div className="hidden group-hover/vol:block w-20 transition-all">
                        <Slider
                          value={[muted ? 0 : Math.round(volume * 100)]}
                          min={0} max={100} step={1}
                          onValueChange={handleVolume}
                          className="[&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5 [&_[role=slider]]:bg-white [&>span:first-child]:h-0.5 [&>span:first-child>span]:bg-white [&>span:first-child]:bg-white/30"
                        />
                      </div>
                    </div>

                    <span className="text-white/80 text-xs tabular-nums ml-1">
                      {formatDuration(currentTime)} / {formatDuration(duration)}
                    </span>
                  </div>

                  {/* Right controls */}
                  <div className="flex items-center gap-1">
                    {/* Playback speed */}
                    <div className="relative">
                      <Button
                        variant="ghost" size="sm"
                        className="h-8 px-2 text-white hover:bg-white/10 text-xs font-semibold gap-1 tabular-nums"
                        onClick={() => setShowSpeedMenu(v => !v)}
                        title="Playback speed"
                      >
                        <Gauge className="h-3.5 w-3.5" />
                        {playbackRate === 1 ? '1x' : `${playbackRate}x`}
                      </Button>
                      {showSpeedMenu && (
                        <div className="absolute bottom-full right-0 mb-1 bg-black/90 border border-white/10 rounded-lg overflow-hidden shadow-xl z-50 min-w-[72px]">
                          {SPEED_OPTIONS.map(speed => (
                            <button
                              key={speed}
                              onClick={() => handleSpeedSelect(speed)}
                              className={`w-full text-xs px-3 py-2 text-left transition-colors ${
                                playbackRate === speed
                                  ? 'bg-white/20 text-white font-semibold'
                                  : 'text-white/80 hover:bg-white/10'
                              }`}
                            >
                              {speed === 1 ? '1x  Normal' : `${speed}x`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-white hover:bg-white/10"
                      onClick={toggleFullscreen}
                      title={fullscreen ? 'Exit fullscreen (f)' : 'Fullscreen (f)'}
                    >
                      {fullscreen
                        ? <Minimize className="h-4 w-4" />
                        : <Maximize className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Progress bar flash at top for mobile hint */}
        <div
          className="absolute top-0 left-0 h-0.5 bg-accent transition-all duration-300 pointer-events-none"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* ── Below-video info (YouTube style) ── */}
      <div className="bg-background px-4 pt-3 pb-4">
        {/* Title */}
        <h2 className="text-base font-semibold leading-snug mb-1 text-foreground">{video.title}</h2>

        {/* Artist / meta row */}
        <p className="text-sm text-muted-foreground mb-3">
          <span className="font-medium text-foreground">{video.artist_name}</span>
          {video.featured_artists && <span> ft. {video.featured_artists}</span>}
          {video.producer && <span> · Prod. {video.producer}</span>}
          <span className="mx-1.5">·</span>
          <span>{video.view_count.toLocaleString()} views</span>
        </p>

        {/* Action row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            className={`gap-1.5 rounded-full border border-border h-8 px-3 text-xs ${liked ? 'text-accent border-accent bg-accent/5' : ''}`}
            onClick={handleLike}
          >
            <ThumbsUp className={`h-3.5 w-3.5 ${liked ? 'fill-accent' : ''}`} />
            Like
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={`gap-1.5 rounded-full border border-border h-8 px-3 text-xs ${saved ? 'text-accent border-accent bg-accent/5' : ''}`}
            onClick={handleSave}
          >
            <BookmarkPlus className={`h-3.5 w-3.5 ${saved ? 'fill-accent' : ''}`} />
            Save
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 rounded-full border border-border h-8 px-3 text-xs"
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>

          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 rounded-full border border-border h-8 px-3 text-xs ml-auto"
              onClick={onClose}
            >
              Close
            </Button>
          )}
        </div>
      </div>

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={shareUrl}
        title={video.title}
        text={shareText}
        thumbnailUrl={video.thumbnail_url}
        embedId={video.id}
        embedType="video"
      />
    </div>
  );
}
