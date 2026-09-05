import { useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X, Music, Download, Share2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuth } from '@/contexts/AuthContext';
import { recordDownload, incrementSongDownloadCount } from '@/lib/api';
import { formatDuration } from '@/lib/utils';
import ShareSheet from '@/components/common/ShareSheet';

export default function MusicPlayer() {
  const { user } = useAuth();
  const {
    currentSong: song, queue, playing, currentTime, duration, volume, muted,
    closeSong, togglePlay, next, prev, seek, setVolume, setMuted,
  } = usePlayer();
  const downloadingRef = useRef(false);
  const [shareOpen, setShareOpen] = useState(false);

  if (!song) return null;

  const shareUrl = `${window.location.origin}/music?id=${song.id}`;
  const shareText = `Listen to ${song.title} by ${song.artist_name} on ZedVevo`;

  const handleSeek = (val: number[]) => seek(val[0]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { toast.error('Sign in to download songs'); return; }
    if (downloadingRef.current) return;
    downloadingRef.current = true;
    try {
      // Fetch as blob so we can write ID3-like comment tag with metadata
      const res = await fetch(song.file_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Filename carries title · artist · album · genre
      const parts = [
        song.title,
        song.artist_name,
        song.album ? `[${song.album}]` : '',
        song.genre ? `(${song.genre})` : '',
      ].filter(Boolean);
      a.download = `${parts.join(' - ')}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      await Promise.all([
        incrementSongDownloadCount(song.id),
        recordDownload({
          user_id: user.id,
          content_id: song.id,
          content_type: 'song',
          file_url: song.file_url,
          title: song.title,
          artist_name: song.artist_name,
          cover_url: song.cover_url,
        }),
      ]);
      toast.success('Download started');
    } catch { toast.error('Download failed'); }
    finally { downloadingRef.current = false; }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShareOpen(true);
  };

  const hasPrev = queue.length > 0 && queue.findIndex(s => s.id === song.id) > 0;
  const hasNext = queue.length > 0 && queue.findIndex(s => s.id === song.id) < queue.length - 1;

  return (
    /* sits above MobileNav (z-40) and below Header (z-50) */
    <div className="fixed bottom-[56px] md:bottom-0 left-0 right-0 z-[45] glass border-t border-border">
      <div className="pb-[env(safe-area-inset-bottom,0px)]">
        <div className="max-w-7xl mx-auto px-3 py-2.5 flex items-center gap-2 md:gap-4">

          {/* Cover + info */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="h-10 w-10 rounded overflow-hidden bg-muted shrink-0">
              {song.cover_url
                ? <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><Music className="h-4 w-4 text-muted-foreground" /></div>
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate leading-tight">{song.title}</p>
              <p className="text-xs text-muted-foreground truncate">{song.artist_name}</p>
            </div>
          </div>

          {/* Controls + seek */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prev} disabled={!hasPrev}>
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                className="h-9 w-9 bg-accent hover:bg-accent/90 text-accent-foreground rounded-full"
                onClick={togglePlay}
              >
                {playing
                  ? <Pause className="h-4 w-4" />
                  : <Play className="h-4 w-4 fill-current ml-0.5" />
                }
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={next} disabled={!hasNext}>
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1.5 w-44 md:w-64">
              <span className="text-[10px] text-muted-foreground w-7 text-right tabular-nums">{formatDuration(currentTime)}</span>
              <Slider
                value={[currentTime]}
                min={0}
                max={duration || 100}
                step={0.5}
                onValueChange={handleSeek}
                className="flex-1"
              />
              <span className="text-[10px] text-muted-foreground w-7 tabular-nums">{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Actions: Download, Share, Volume (desktop), Close */}
          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload} title="Download">
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleShare} title="Share">
              <Share2 className="h-3.5 w-3.5" />
            </Button>
            <div className="hidden md:flex items-center gap-1.5 ml-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMuted(!muted)}>
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Slider
                value={[muted ? 0 : volume * 100]}
                min={0} max={100} step={1}
                onValueChange={v => setVolume(v[0] / 100)}
                className="w-20"
              />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 ml-0.5" onClick={closeSong} title="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>

        </div>
      </div>
      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={shareUrl}
        title={song.title}
        text={shareText}
      />
    </div>
  );
}
