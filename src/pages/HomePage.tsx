import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Song, Video, Artist, Sponsor } from '@/types/index';
import {  getTrendingSongs, getPopularSongs, getNewSongs,
  getTrendingVideos, getFeaturedArtists, getActiveSponsors
} from '@/lib/api';
import HeroSlider from '@/components/hero/HeroSlider';
import SectionRow from '@/components/common/SectionRow';
import MusicCard from '@/components/music/MusicCard';
import VideoCard from '@/components/video/VideoCard';
import VideoPlayer from '@/components/video/VideoPlayer';
import { usePlayer } from '@/contexts/PlayerContext';
import { useVisitorTracking } from '@/hooks/use-visitor-tracking';

export default function HomePage() {
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [popularSongs, setPopularSongs] = useState<Song[]>([]);
  const [newSongs, setNewSongs] = useState<Song[]>([]);
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const { currentSong, playSong } = usePlayer();
  useVisitorTracking('/');
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      getTrendingSongs(8),
      getPopularSongs(8),
      getNewSongs(8),
      getTrendingVideos(8),
      getFeaturedArtists(8),
      getActiveSponsors(),
    ]).then(([ts, ps, ns, tv, ar, sp]) => {
      setTrendingSongs(ts);
      setPopularSongs(ps);
      setNewSongs(ns);
      setTrendingVideos(tv);
      setArtists(ar);
      setSponsors(sp);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleVideoPlay = (video: Video) => {
    setCurrentVideo(video);
    // Smooth-scroll to inline player
    setTimeout(() => {
      playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      {/* Hero */}
      <div className="pt-0">
        <HeroSlider />
      </div>

      {/* ── Inline Video Player (shows when a video is selected) ── */}
      {currentVideo && (
        <div ref={playerRef} className="border-b border-border">
          <VideoPlayer video={currentVideo} onClose={() => setCurrentVideo(null)} />
        </div>
      )}

      {/* Trending Now */}
      <SectionRow title="Trending Now" viewAllLink="/music" loading={loading} grid skeletonCount={6} skeletonClassName="aspect-square">
        {trendingSongs.map(song => (
          <MusicCard key={song.id} song={song} isPlaying={currentSong?.id === song.id} onPlay={s => playSong(s, trendingSongs)} />
        ))}
      </SectionRow>

      <div className="border-t border-border" />

      {/* New Releases */}
      <SectionRow title="New Releases" viewAllLink="/music" loading={loading} grid skeletonCount={6} skeletonClassName="aspect-square">
        {newSongs.map(song => (
          <MusicCard key={song.id} song={song} isPlaying={currentSong?.id === song.id} onPlay={s => playSong(s, newSongs)} />
        ))}
      </SectionRow>

      <div className="border-t border-border" />

      {/* Popular Music */}
      <SectionRow title="Popular Music" viewAllLink="/music" loading={loading} grid skeletonCount={6} skeletonClassName="aspect-square">
        {popularSongs.map(song => (
          <MusicCard key={song.id} song={song} isPlaying={currentSong?.id === song.id} onPlay={s => playSong(s, popularSongs)} />
        ))}
      </SectionRow>

      <div className="border-t border-border" />

      {/* Videos */}
      <SectionRow title="Trending Videos" viewAllLink="/videos" loading={loading} grid skeletonCount={4} skeletonClassName="aspect-video">
        {trendingVideos.length > 0
          ? trendingVideos.map(video => (
              <VideoCard
                key={video.id}
                video={video}
                active={currentVideo?.id === video.id}
                onPlay={handleVideoPlay}
              />
            ))
          : !loading && (
              <div className="col-span-full text-center py-10 text-muted-foreground">
                <p className="text-sm">No videos yet — be the first to upload!</p>
                <Link to="/upload" className="text-xs text-accent hover:underline mt-1 inline-block">Upload Video →</Link>
              </div>
            )
        }
      </SectionRow>

      <div className="border-t border-border" />

      {/* Featured Artists — ordered by newest */}
      <SectionRow title="New Artists" viewAllLink="/music" loading={loading} grid skeletonCount={6} skeletonClassName="aspect-square">
        {artists.map(artist => (
          <div key={artist.id} className="text-center group">
            <div className="h-20 w-20 md:h-28 md:w-28 rounded-full overflow-hidden mx-auto mb-2 bg-muted border-2 border-border group-hover:border-accent transition-colors">
              {artist.avatar_url
                ? <img src={artist.avatar_url} alt={artist.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground/40">{artist.name[0]}</div>
              }
            </div>
            <p className="text-xs font-semibold truncate">{artist.name}</p>
            <p className="text-[10px] text-muted-foreground">{artist.play_count.toLocaleString()} plays</p>
          </div>
        ))}
      </SectionRow>

      {/* Sponsors */}
      {sponsors.length > 0 && (
        <>
          <div className="border-t border-border" />
          <section className="py-6">
            <div className="max-w-7xl mx-auto px-4">
              <h2 className="text-sm font-semibold text-muted-foreground text-center uppercase tracking-widest mb-4">Award Sponsors</h2>
              <div className="flex flex-wrap items-center justify-center gap-6">
                {sponsors.map(sponsor => (
                  <a key={sponsor.id} href={sponsor.website_url || '#'} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity"
                  >
                    {sponsor.logo_url
                      ? <img src={sponsor.logo_url} alt={sponsor.name} className="h-8 object-contain" />
                      : <span className="text-sm font-semibold text-muted-foreground">{sponsor.name}</span>
                    }
                  </a>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
