import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Song } from '@/types/index';
import { getSongs, getSongById } from '@/lib/api';
import MusicCard from '@/components/music/MusicCard';
import BackToHome from '@/components/common/BackToHome';
import { usePlayer } from '@/contexts/PlayerContext';
import { useOgMeta } from '@/hooks/use-og-meta';
import { useVisitorTracking } from '@/hooks/use-visitor-tracking';
import { useSearchParams } from 'react-router-dom';

const GENRES = ['All', 'Afrobeats', 'Hip-Hop', 'R&B', 'Gospel', 'Traditional', 'Pop', 'Dance'];

export default function MusicPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('All');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { currentSong, playSong } = usePlayer();
  const [searchParams] = useSearchParams();
  const [focusSong, setFocusSong] = useState<Song | null>(null);

  // Fetch focused song from ?id= and inject OG meta for share previews
  useEffect(() => {
    const id = searchParams.get('id');
    if (!id) { setFocusSong(null); return; }
    getSongById(id).then(s => { if (s) setFocusSong(s); }).catch(() => {});
  }, [searchParams]);

  useOgMeta(focusSong ? {
    title: `${focusSong.title} — ${focusSong.featured_artists ? `${focusSong.artist_name} ft. ${focusSong.featured_artists}` : focusSong.artist_name} | ZedVevo MP3`,
    description: `Listen to "${focusSong.title}" by ${focusSong.featured_artists ? `${focusSong.artist_name} ft. ${focusSong.featured_artists}` : focusSong.artist_name} on ZedVevo — Zambia's music platform.`,
    imageUrl: focusSong.cover_url ?? undefined,
    pageUrl: `${window.location.origin}/music?id=${focusSong.id}`,
  } : {
    title: 'ZedVevo — Zambian Music & Video',
    description: 'Stream and discover the best Zambian music on ZedVevo.',
  });

  useVisitorTracking('/music');

  const LIMIT = 24;

  const load = async (reset = false) => {
    setLoading(true);
    try {
      const data = await getSongs({ status: 'approved', limit: LIMIT, offset: reset ? 0 : offset });
      setSongs(prev => reset ? data : [...prev, ...data]);
      setHasMore(data.length === LIMIT);
      if (!reset) setOffset(prev => prev + LIMIT);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { setOffset(0); load(true); }, []);

  const filtered = songs.filter(s => {
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.artist_name.toLowerCase().includes(search.toLowerCase());
    const matchGenre = genre === 'All' || s.genre === genre;
    return matchSearch && matchGenre;
  });

  return (
    <div className="min-h-screen pt-20 pb-24 lg:pb-6">
      <div className="max-w-7xl mx-auto px-4">
        <BackToHome />
        {/* Header */}
        <div className="py-6 border-b border-border mb-6">
          <h1 className="text-2xl font-bold mb-1">Music</h1>
          <p className="text-sm text-muted-foreground">Discover Zambian music</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search songs, artists..."
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

        {/* Grid */}
        {loading && songs.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-sm">No songs found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filtered.map(song => (
              <MusicCard
                key={song.id}
                song={song}
                isPlaying={currentSong?.id === song.id}
                onPlay={s => playSong(s, filtered)}
              />
            ))}
          </div>
        )}

        {hasMore && !loading && (
          <div className="text-center mt-8">
            <Button variant="outline" onClick={() => load()}>Load more</Button>
          </div>
        )}
        {loading && songs.length > 0 && (
          <div className="text-center mt-6 text-sm text-muted-foreground">Loading...</div>
        )}
      </div>
    </div>
  );
}
