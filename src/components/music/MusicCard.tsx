import { useState } from 'react';
import { Play, Pause, Heart, BookmarkPlus, Share2, Music, Download, X, Clock, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Song } from '@/types/index';
import { useAuth } from '@/contexts/AuthContext';
import { toggleLike, toggleSave, recordDownload, incrementSongDownloadCount } from '@/lib/api';
import { formatDuration } from '@/lib/utils';
import ShareSheet from '@/components/common/ShareSheet';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface MusicCardProps {
  song: Song;
  isPlaying?: boolean;
  onPlay?: (song: Song) => void;
  compact?: boolean;
}

export default function MusicCard({ song, isPlaying, onPlay, compact = false }: MusicCardProps) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(song.liked ?? false);
  const [saved, setSaved] = useState(song.saved ?? false);
  const [downloading, setDownloading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const shareUrl = `${window.location.origin}/song/${song.id}`;
  // Build artist label: "Artist ft. Featured1, Featured2"
  const artistLabel = song.featured_artists
    ? `${song.artist_name} ft. ${song.featured_artists}`
    : song.artist_name;
  const shareText = `Listen to "${song.title}" by ${artistLabel} on ZedVevo — ${shareUrl}`;

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { toast.error('Sign in to like songs'); return; }
    try {
      const result = await toggleLike(user.id, song.id, 'song');
      setLiked(result);
      toast.success(result ? 'Added to liked' : 'Removed from liked');
    } catch { toast.error('Failed to update like'); }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { toast.error('Sign in to save songs'); return; }
    try {
      const result = await toggleSave(user.id, song.id, 'song');
      setSaved(result);
      toast.success(result ? 'Saved to library' : 'Removed from library');
    } catch { toast.error('Failed to update library'); }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShareOpen(true);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { toast.error('Sign in to download songs'); return; }
    if (downloading) return;
    setDownloading(true);
    try {
      const a = document.createElement('a');
      a.href = song.file_url;
      a.download = `${song.title} - ${song.artist_name}.mp3`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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
    finally { setDownloading(false); }
  };

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors group ${
          isPlaying ? 'bg-accent/10' : 'hover:bg-muted'
        }`}
        onClick={() => onPlay?.(song)}
      >
        <div className="relative h-10 w-10 rounded shrink-0 overflow-hidden bg-muted">
          {song.cover_url ? (
            <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${
            isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}>
            {isPlaying ? <Pause className="h-3 w-3 text-white" /> : <Play className="h-3 w-3 text-white fill-white" />}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isPlaying ? 'text-accent' : ''}`}>{song.title}</p>
          <p className="text-xs text-muted-foreground truncate">{song.artist_name}</p>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{formatDuration(song.duration)}</span>
      </div>
    );
  }

  return (
    <>
      {/* Card — clicking the cover/title area opens the Spotify-style detail modal */}
      <div
        className="group relative bg-card border border-border rounded-lg overflow-hidden card-hover cursor-pointer"
        onClick={() => setDetailOpen(true)}
      >
        {/* Cover */}
        <div className="relative aspect-square bg-muted overflow-hidden">
          {song.cover_url ? (
            <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Music className="h-12 w-12 text-muted-foreground/40" />
            </div>
          )}
          {/* Play overlay */}
          <div
            className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${
              isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            onClick={e => { e.stopPropagation(); onPlay?.(song); }}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isPlaying ? 'bg-accent' : 'bg-white/90'}`}>
              {isPlaying
                ? <Pause className="h-5 w-5 text-white" />
                : <Play className="h-5 w-5 text-foreground fill-foreground ml-0.5" />
              }
            </div>
          </div>
          {song.is_trending && (
            <span className="absolute top-2 left-2 bg-accent text-accent-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">
              Trending
            </span>
          )}
        </div>

        {/* Info row */}
        <div className="p-3">
          <h3 className="font-semibold text-sm truncate mb-0.5">{song.title}</h3>
          <p className="text-xs text-muted-foreground truncate">{song.artist_name}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">{song.play_count.toLocaleString()} plays</span>
            <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleLike}>
                <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-destructive text-destructive' : ''}`} />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSave}>
                <BookmarkPlus className={`h-3.5 w-3.5 ${saved ? 'fill-accent text-accent' : ''}`} />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload} disabled={downloading}>
                <Download className={`h-3.5 w-3.5 ${downloading ? 'animate-pulse text-accent' : ''}`} />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleShare}>
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Spotify-style Song Detail Modal ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md p-0 overflow-hidden">
          {/* Hero cover */}
          <div className="relative w-full aspect-square bg-muted">
            {song.cover_url ? (
              <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="h-20 w-20 text-muted-foreground/30" />
              </div>
            )}
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            {/* Close */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/60"
              onClick={() => setDetailOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            {/* Title over image */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h2 className="text-white text-lg font-bold leading-tight truncate">{song.title}</h2>
              <p className="text-white/70 text-sm truncate">{song.artist_name}</p>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4">
            {/* Play + action row */}
            <div className="flex items-center justify-between">
              <Button
                className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-6"
                onClick={() => { onPlay?.(song); setDetailOpen(false); }}
              >
                {isPlaying ? <><Pause className="h-4 w-4 mr-2" />Pause</> : <><Play className="h-4 w-4 mr-2 fill-current" />Play</>}
              </Button>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={e => handleLike(e)}>
                  <Heart className={`h-5 w-5 ${liked ? 'fill-destructive text-destructive' : ''}`} />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={e => handleSave(e)}>
                  <BookmarkPlus className={`h-5 w-5 ${saved ? 'fill-accent text-accent' : ''}`} />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={e => { e.stopPropagation(); setShareOpen(true); }}>
                  <Share2 className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={e => handleDownload(e)} disabled={downloading}>
                  <Download className={`h-5 w-5 ${downloading ? 'animate-pulse text-accent' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Meta chips */}
            <div className="flex flex-wrap gap-2">
              {song.genre && <Badge variant="secondary">{song.genre}</Badge>}
              {song.album && <Badge variant="outline">{song.album}</Badge>}
              {song.is_trending && <Badge className="bg-accent text-accent-foreground">Trending</Badge>}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted rounded-lg py-2 px-1">
                <p className="text-sm font-bold">{song.play_count.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 mt-0.5">
                  <BarChart2 className="h-3 w-3" />Plays
                </p>
              </div>
              <div className="bg-muted rounded-lg py-2 px-1">
                <p className="text-sm font-bold">{song.like_count.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 mt-0.5">
                  <Heart className="h-3 w-3" />Likes
                </p>
              </div>
              <div className="bg-muted rounded-lg py-2 px-1">
                <p className="text-sm font-bold">{formatDuration(song.duration)}</p>
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 mt-0.5">
                  <Clock className="h-3 w-3" />Duration
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={shareUrl}
        title={`${song.title} — ${artistLabel}`}
        text={shareText}
        thumbnailUrl={song.cover_url}
        embedId={song.id}
        embedType="song"
      />
    </>
  );
}
