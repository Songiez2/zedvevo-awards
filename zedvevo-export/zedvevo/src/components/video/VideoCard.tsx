import { useState } from 'react';
import { Play, Heart, BookmarkPlus, Share2, Video as VideoIcon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Video } from '@/types/index';
import { useAuth } from '@/contexts/AuthContext';
import { toggleLike, toggleSave, recordDownload, incrementVideoDownloadCount } from '@/lib/api';
import { formatDuration } from '@/lib/utils';
import ShareSheet from '@/components/common/ShareSheet';

interface VideoCardProps {
  video: Video;
  onPlay?: (video: Video) => void;
  active?: boolean;
}

export default function VideoCard({ video, onPlay, active = false }: VideoCardProps) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(video.liked ?? false);
  const [saved, setSaved] = useState(video.saved ?? false);
  const [downloading, setDownloading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const shareUrl = `${window.location.origin}/videos?id=${video.id}`;
  const shareText = `Watch "${video.title}" by ${video.artist_name} on ZedVevo — ${window.location.origin}/videos?id=${video.id}`;

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { toast.error('Sign in to like videos'); return; }
    try {
      const result = await toggleLike(user.id, video.id, 'video');
      setLiked(result);
      toast.success(result ? 'Added to liked' : 'Removed from liked');
    } catch { toast.error('Failed to update like'); }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { toast.error('Sign in to save videos'); return; }
    try {
      const result = await toggleSave(user.id, video.id, 'video');
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
    if (!user) { toast.error('Sign in to download videos'); return; }
    if (!video.downloads_enabled) { toast.error('Downloads are not enabled for this video'); return; }
    if (downloading) return;
    setDownloading(true);
    try {
      const a = document.createElement('a');
      a.href = video.file_url;
      a.download = `${video.title} - ${video.artist_name}.mp4`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      await Promise.all([
        incrementVideoDownloadCount(video.id),
        recordDownload({
          user_id: user.id,
          content_id: video.id,
          content_type: 'video',
          file_url: video.file_url,
          title: video.title,
          artist_name: video.artist_name,
          cover_url: video.thumbnail_url,
        }),
      ]);
      toast.success('Download started');
    } catch { toast.error('Download failed'); }
    finally { setDownloading(false); }
  };

  return (
    <div className={`group relative bg-card border rounded-lg overflow-hidden card-hover transition-all ${active ? 'border-accent ring-1 ring-accent/30' : 'border-border'}`}>
      {/* Thumbnail */}
      <div
        className="relative aspect-video bg-muted overflow-hidden cursor-pointer"
        onClick={() => onPlay?.(video)}
      >
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <VideoIcon className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <Play className="h-5 w-5 text-foreground fill-foreground ml-0.5" />
          </div>
        </div>
        {video.duration && (
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
            {formatDuration(video.duration)}
          </span>
        )}
        {active && (
          <span className="absolute top-2 left-2 bg-accent text-accent-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">
            Now Playing
          </span>
        )}
        {!active && video.is_trending && (
          <span className="absolute top-2 left-2 bg-accent text-accent-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">
            Trending
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm truncate mb-0.5">{video.title}</h3>
        <p className="text-xs text-muted-foreground truncate">
          {video.artist_name}
          {video.featured_artists && <span className="text-muted-foreground/70"> ft. {video.featured_artists}</span>}
        </p>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">{video.view_count.toLocaleString()} views</span>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleLike}>
              <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-destructive text-destructive' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSave}>
              <BookmarkPlus className={`h-3.5 w-3.5 ${saved ? 'fill-accent text-accent' : ''}`} />
            </Button>
            {video.downloads_enabled && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload} disabled={downloading}>
                <Download className={`h-3.5 w-3.5 ${downloading ? 'animate-pulse text-accent' : ''}`} />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleShare}>
              <Share2 className="h-3.5 w-3.5" />
            </Button>
          </div>
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
