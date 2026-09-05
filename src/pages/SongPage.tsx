import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSongById } from '@/lib/api';
import type { Song } from '@/types/index';
import { usePlayer } from '@/contexts/PlayerContext';
import { useOgMeta } from '@/hooks/use-og-meta';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Play, ArrowLeft, Music2 } from 'lucide-react';
import BackToHome from '@/components/common/BackToHome';

export default function SongPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { playSong } = usePlayer();
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    getSongById(id)
      .then(s => { if (s) setSong(s); else setNotFound(true); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const artistLabel = song?.featured_artists
    ? `${song.artist_name} ft. ${song.featured_artists}`
    : song?.artist_name ?? '';

  useOgMeta({
    title: song ? `${song.title} — ${artistLabel} | ZedVevo` : 'ZedVevo — Zambian Music',
    description: song
      ? `Listen to "${song.title}" by ${artistLabel} on ZedVevo — Zambia's music platform.`
      : 'Discover Zambian music on ZedVevo.',
    imageUrl: song?.cover_url ?? undefined,
    // Edge function URL — crawlers (WhatsApp, Facebook) fetch this and get
    // server-rendered OG meta with real song title, artist, cover image.
    // Real visitors who click the shared link are redirected to the SPA page.
    pageUrl: song
      ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share?song=${song.id}`
      : undefined,
  });

  if (loading) return (
    <div className="min-h-screen flex flex-col">
      <BackToHome />
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-4">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  );

  if (notFound || !song) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
      <Music2 className="h-12 w-12 text-muted-foreground/30" />
      <p className="text-muted-foreground">Song not found.</p>
      <Button variant="outline" onClick={() => navigate('/music')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Browse Music
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <BackToHome />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-5">
          {/* Cover */}
          <div className="aspect-square w-full rounded-xl overflow-hidden bg-muted shadow-sm">
            {song.cover_url
              ? <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center">
                  <Music2 className="h-16 w-16 text-muted-foreground/30" />
                </div>
            }
          </div>

          {/* Meta */}
          <div className="space-y-1">
            <h1 className="text-xl font-semibold leading-tight">{song.title}</h1>
            <p className="text-sm text-muted-foreground">{artistLabel}</p>
            {song.genre && <p className="text-xs text-muted-foreground">{song.genre}</p>}
          </div>

          {/* Play */}
          <Button
            className="w-full gap-2"
            onClick={() => { playSong(song); navigate('/music?id=' + song.id); }}
          >
            <Play className="h-4 w-4 fill-current" />
            Play Song
          </Button>

          <Button variant="outline" className="w-full" onClick={() => navigate('/music')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> All Music
          </Button>
        </div>
      </div>
    </div>
  );
}
