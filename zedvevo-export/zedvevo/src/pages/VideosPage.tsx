import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Video } from '@/types/index';
import { getVideos, getVideoById } from '@/lib/api';
import VideoCard from '@/components/video/VideoCard';
import VideoPlayer from '@/components/video/VideoPlayer';
import BackToHome from '@/components/common/BackToHome';
import { useOgMeta } from '@/hooks/use-og-meta';
import { useVisitorTracking } from '@/hooks/use-visitor-tracking';
import { useSearchParams } from 'react-router-dom';

const GENRES = ['All', 'Music Video', 'Live', 'Lyric', 'Behind the Scenes', 'Documentary'];

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('All');
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchParams] = useSearchParams();
  const [focusVideo, setFocusVideo] = useState<Video | null>(null);

  // Fetch focused video from ?id= and inject OG meta for share previews
  useEffect(() => {
    const id = searchParams.get('id');
    if (!id) { setFocusVideo(null); return; }
    getVideoById(id).then(v => { if (v) setFocusVideo(v); }).catch(() => {});
  }, [searchParams]);

  useOgMeta(focusVideo ? {
    title: `${focusVideo.title} — ${focusVideo.featured_artists ? `${focusVideo.artist_name} ft. ${focusVideo.featured_artists}` : focusVideo.artist_name} | ZedVevo MP4`,
    description: `Watch "${focusVideo.title}" by ${focusVideo.featured_artists ? `${focusVideo.artist_name} ft. ${focusVideo.featured_artists}` : focusVideo.artist_name} on ZedVevo — Zambia's video platform.`,
    imageUrl: focusVideo.thumbnail_url ?? undefined,
    pageUrl: `${window.location.origin}/videos?id=${focusVideo.id}`,
  } : {
    title: 'ZedVevo — Zambian Music Videos',
    description: 'Watch the best Zambian music videos on ZedVevo.',
  });

  useVisitorTracking('/videos');

  const LIMIT = 20;

  const load = async (reset = false) => {
    setLoading(true);
    try {
      const data = await getVideos({ status: 'approved', limit: LIMIT, offset: reset ? 0 : offset });
      setVideos(prev => reset ? data : [...prev, ...data]);
      setHasMore(data.length === LIMIT);
      if (!reset) setOffset(prev => prev + LIMIT);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { setOffset(0); load(true); }, []);

  const filtered = videos.filter(v => {
    const matchSearch = !search || v.title.toLowerCase().includes(search.toLowerCase()) || v.artist_name.toLowerCase().includes(search.toLowerCase());
    const matchGenre = genre === 'All' || v.genre === genre;
    return matchSearch && matchGenre;
  });

  return (
    <div className="min-h-screen pt-20 pb-24 lg:pb-6">
      <div className="max-w-7xl mx-auto px-4">
        <BackToHome />
        <div className="py-6 border-b border-border mb-6">
          <h1 className="text-2xl font-bold mb-1">Videos</h1>
          <p className="text-sm text-muted-foreground">Watch Zambian music videos</p>
        </div>

        {/* Inline YouTube-style player */}
        {currentVideo && (
          <div className="mb-8 rounded-xl overflow-hidden border border-border shadow-lg">
            <VideoPlayer
              video={currentVideo}
              onClose={() => setCurrentVideo(null)}
            />
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search videos, artists..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scroll-row pb-1">
            {GENRES.map(g => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  genre === g
                    ? 'bg-accent text-accent-foreground border-accent'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {loading && videos.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-video rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-sm">No videos found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(video => (
              <VideoCard
                key={video.id}
                video={video}
                onPlay={v => { setCurrentVideo(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                active={currentVideo?.id === video.id}
              />
            ))}
          </div>
        )}

        {hasMore && !loading && (
          <div className="text-center mt-8">
            <Button variant="outline" onClick={() => load()}>Load more</Button>
          </div>
        )}
      </div>
    </div>
  );
}
