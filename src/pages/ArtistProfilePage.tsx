import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Music2, Video } from 'lucide-react';
import type { Artist, Song, Video as VideoType } from '@/types';
import { getArtistContent, getArtistProfile } from '@/lib/api';
import MusicCard from '@/components/music/MusicCard';
import VideoCard from '@/components/video/VideoCard';
import { usePlayer } from '@/contexts/PlayerContext';

export default function ArtistProfilePage() {
  const { id = '' } = useParams();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentSong, playSong } = usePlayer();

  useEffect(() => {
    Promise.all([getArtistProfile(id), getArtistContent(id)])
      .then(([profile, content]) => { setArtist(profile); setSongs(content.songs); setVideos(content.videos); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen pt-28 text-center text-muted-foreground">Loading artist…</div>;
  if (!artist) return <div className="min-h-screen pt-28 text-center text-muted-foreground">Artist not found.</div>;
  const downloads = [...songs, ...videos].reduce((total, item) => total + item.download_count, 0);

  return <main className="min-h-screen pt-24 pb-24 max-w-6xl mx-auto px-4">
    <section className="rounded-xl border border-border overflow-hidden mb-8">
      <div className="h-36 bg-muted">{artist.cover_url && <img src={artist.cover_url} alt="" className="h-full w-full object-cover" />}</div>
      <div className="p-5 flex gap-4 items-end -mt-12 relative">
        <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-background bg-muted shrink-0">{artist.avatar_url ? <img src={artist.avatar_url} alt={artist.name} className="h-full w-full object-cover" /> : <div className="h-full grid place-items-center text-3xl">{artist.name[0]}</div>}</div>
        <div><h1 className="text-2xl font-bold">{artist.name}</h1><p className="text-sm text-muted-foreground">{artist.play_count.toLocaleString()} plays · <Download className="inline h-3.5 w-3.5" /> {downloads.toLocaleString()} downloads</p></div>
      </div>
      {artist.bio && <p className="px-5 pb-5 text-sm text-muted-foreground">{artist.bio}</p>}
    </section>
    <h2 className="font-semibold mb-3 flex items-center gap-2"><Music2 className="h-4 w-4" /> Songs</h2>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">{songs.map(song => <MusicCard key={song.id} song={song} isPlaying={currentSong?.id === song.id} onPlay={selected => playSong(selected, songs)} />)}</div>
    <h2 className="font-semibold mb-3 flex items-center gap-2"><Video className="h-4 w-4" /> Videos</h2>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{videos.map(video => <VideoCard key={video.id} video={video} onPlay={() => undefined} />)}</div>
  </main>;
}
