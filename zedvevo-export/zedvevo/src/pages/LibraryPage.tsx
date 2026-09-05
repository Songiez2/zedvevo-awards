import BackToHome from '@/components/common/BackToHome';
import { useState, useEffect } from 'react';
import { Music2, Video, BookmarkPlus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import type { Song, Video as VideoType } from '@/types/index';
import { getSongs, getVideos, getSavedContentIds } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import MusicCard from '@/components/music/MusicCard';
import VideoCard from '@/components/video/VideoCard';
import VideoPlayer from '@/components/video/VideoPlayer';
import { Navigate } from 'react-router-dom';
import { usePlayer } from '@/contexts/PlayerContext';

export default function LibraryPage() {
  const { user } = useAuth();
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [savedVideos, setSavedVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentVideo, setCurrentVideo] = useState<VideoType | null>(null);
  const { currentSong, playSong } = usePlayer();

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const [songIds, videoIds] = await Promise.all([
          getSavedContentIds(user.id, 'song'),
          getSavedContentIds(user.id, 'video'),
        ]);
        const [songs, videos] = await Promise.all([
          songIds.length > 0 ? getSongs({ status: 'approved', limit: 100 }) : Promise.resolve([]),
          videoIds.length > 0 ? getVideos({ status: 'approved', limit: 100 }) : Promise.resolve([]),
        ]);
        setLikedSongs(songs.filter(s => songIds.includes(s.id)));
        setSavedVideos(videos.filter(v => videoIds.includes(v.id)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen pt-20 pb-24 lg:pb-6">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <BackToHome />
        <div className="border-b border-border pb-4 mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
            <BookmarkPlus className="h-6 w-6 text-accent" /> My Library
          </h1>
          <p className="text-sm text-muted-foreground">Your saved music and videos</p>
        </div>

        <Tabs defaultValue="music">
          <TabsList className="mb-6">
            <TabsTrigger value="music" className="flex items-center gap-2">
              <Music2 className="h-4 w-4" /> Music
              {!loading && <span className="text-xs text-muted-foreground ml-1">({likedSongs.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Video className="h-4 w-4" /> Videos
              {!loading && <span className="text-xs text-muted-foreground ml-1">({savedVideos.length})</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="music">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
              </div>
            ) : likedSongs.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Music2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No saved songs yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {likedSongs.map(song => (
                  <MusicCard key={song.id} song={song} isPlaying={currentSong?.id === song.id} onPlay={s => playSong(s, likedSongs)} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="videos">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-video rounded-lg" />)}
              </div>
            ) : savedVideos.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Video className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No saved videos yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {savedVideos.map(video => <VideoCard key={video.id} video={video} onPlay={setCurrentVideo} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {currentVideo && <VideoPlayer video={currentVideo} onClose={() => setCurrentVideo(null)} />}
    </div>
  );
}
