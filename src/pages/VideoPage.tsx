import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVideoById } from '@/lib/api';
import type { Video } from '@/types/index';
import { useOgMeta } from '@/hooks/use-og-meta';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, VideoIcon } from 'lucide-react';
import BackToHome from '@/components/common/BackToHome';

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    getVideoById(id)
      .then(v => { if (v) setVideo(v); else setNotFound(true); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const artistLabel = video?.featured_artists
    ? `${video.artist_name} ft. ${video.featured_artists}`
    : video?.artist_name ?? '';

  useOgMeta({
    title: video ? `${video.title} — ${artistLabel} | ZedVevo` : 'ZedVevo — Zambian Videos',
    description: video
      ? `Watch "${video.title}" by ${artistLabel} on ZedVevo — Zambia's video platform.`
      : 'Discover Zambian music videos on ZedVevo.',
    imageUrl: video?.thumbnail_url ?? undefined,
    // Edge function URL — crawlers (WhatsApp, Facebook) fetch this and get
    // server-rendered OG meta with real video title, artist, thumbnail image.
    // Real visitors who click the shared link are redirected to the SPA page.
    pageUrl: video
      ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share?video=${video.id}`
      : undefined,
  });

  if (loading) return (
    <div className="min-h-screen flex flex-col">
      <BackToHome />
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-xl space-y-4">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  );

  if (notFound || !video) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
      <VideoIcon className="h-12 w-12 text-muted-foreground/30" />
      <p className="text-muted-foreground">Video not found.</p>
      <Button variant="outline" onClick={() => navigate('/videos')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Browse Videos
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <BackToHome />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl space-y-5">
          {/* Video player */}
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-muted shadow-sm">
            {video.file_url
              ? <video
                  src={video.file_url}
                  poster={video.thumbnail_url ?? undefined}
                  controls
                  className="w-full h-full object-cover"
                />
              : video.thumbnail_url
                ? <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center">
                    <VideoIcon className="h-16 w-16 text-muted-foreground/30" />
                  </div>
            }
          </div>

          {/* Meta */}
          <div className="space-y-1">
            <h1 className="text-xl font-semibold leading-tight">{video.title}</h1>
            <p className="text-sm text-muted-foreground">{artistLabel}</p>
            {video.genre && <p className="text-xs text-muted-foreground">{video.genre}</p>}
          </div>

          <Button variant="outline" className="w-full" onClick={() => navigate('/videos')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> All Videos
          </Button>
        </div>
      </div>
    </div>
  );
}
