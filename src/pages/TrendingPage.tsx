import BackToHome from '@/components/common/BackToHome';
import { useState, useEffect } from 'react';
import { TrendingUp, Music2, Video as VideoIcon, Heart, Download, Play, Eye, Loader2, RefreshCw, Users, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getWeeklyTrending, computeAndStoreWeeklyTrending, getSongById, getVideoById, getAllProfiles, getAllNominees } from '@/lib/api';
import type { WeeklyTrending, Video, Profile, Nominee } from '@/types/index';
import { useAuth } from '@/contexts/AuthContext';
import VideoPlayer from '@/components/video/VideoPlayer';
import { toast } from 'sonner';
import { usePlayer } from '@/contexts/PlayerContext';

const WEEKLY_CATS = [
  { value: 'most_played', label: 'Most Played', icon: Play, color: 'text-accent' },
  { value: 'most_downloaded', label: 'Most Downloaded', icon: Download, color: 'text-green-600' },
  { value: 'most_viewed', label: 'Most Viewed', icon: Eye, color: 'text-blue-600' },
  { value: 'most_liked', label: 'Most Liked', icon: Heart, color: 'text-red-500' },
];

function TrendingRow({ item, rank, onPlay }: { item: WeeklyTrending; rank: number; onPlay: (item: WeeklyTrending) => void }) {
  const Icon = item.content_type === 'song' ? Music2 : VideoIcon;
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/40 cursor-pointer transition-colors group" onClick={() => onPlay(item)}>
      <span className={`text-lg font-bold w-7 text-center shrink-0 ${rank <= 3 ? 'text-accent' : 'text-muted-foreground/40'}`}>{rank}</span>
      <div className="h-11 w-11 rounded-md shrink-0 overflow-hidden bg-muted flex items-center justify-center">
        {item.cover_url
          ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
          : <Icon className="h-5 w-5 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-accent">{item.title}</p>
        <p className="text-xs text-muted-foreground truncate">{item.artist_name}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className="text-[10px] capitalize hidden sm:inline-flex">{item.content_type}</Badge>
        <span className="text-xs text-muted-foreground font-medium">{item.metric_value.toLocaleString()}</span>
      </div>
    </div>
  );
}

function ArtistRow({ artist, rank }: { artist: Profile; rank: number }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/40 transition-colors">
      <span className={`text-lg font-bold w-7 text-center shrink-0 ${rank <= 3 ? 'text-accent' : 'text-muted-foreground/40'}`}>{rank}</span>
      <Avatar className="h-11 w-11 shrink-0">
        <AvatarImage src={artist.avatar_url || undefined} />
        <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-sm">
          {(artist.display_name || artist.username || '?')[0].toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{artist.display_name || artist.username}</p>
        <p className="text-xs text-muted-foreground truncate">@{artist.username}</p>
      </div>
      <Badge variant="outline" className="text-[10px] shrink-0">Artist</Badge>
    </div>
  );
}

function NomineeRow({ nominee, rank }: { nominee: Nominee; rank: number }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/40 transition-colors">
      <span className={`text-lg font-bold w-7 text-center shrink-0 ${rank <= 3 ? 'text-accent' : 'text-muted-foreground/40'}`}>{rank}</span>
      <div className="h-11 w-11 rounded-full shrink-0 overflow-hidden bg-muted flex items-center justify-center">
        {nominee.photo_url
          ? <img src={nominee.photo_url} alt={nominee.name} className="w-full h-full object-cover" />
          : <span className="text-lg font-bold text-muted-foreground/40">{nominee.name[0]}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{nominee.name}</p>
        <p className="text-xs text-muted-foreground truncate">{nominee.song_title || 'Nominee'}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Trophy className="h-3.5 w-3.5 text-accent" />
        <span className="text-xs font-semibold">{(nominee.total_votes || 0).toLocaleString()}</span>
        <span className="text-xs text-muted-foreground hidden sm:inline">votes</span>
      </div>
    </div>
  );
}

export default function TrendingPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<Record<string, WeeklyTrending[]>>({});
  const [artists, setArtists] = useState<Profile[]>([]);
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const { playSong } = usePlayer();

  const load = async () => {
    setLoading(true);
    try {
      const [played, downloaded, viewed, liked, allProfiles, allNominees] = await Promise.all([
        getWeeklyTrending('most_played'),
        getWeeklyTrending('most_downloaded'),
        getWeeklyTrending('most_viewed'),
        getWeeklyTrending('most_liked'),
        getAllProfiles(),
        getAllNominees(),
      ]);
      setData({ most_played: played, most_downloaded: downloaded, most_viewed: viewed, most_liked: liked });
      // Rising artists = profiles with role 'artist', newest first
      setArtists(allProfiles.filter(p => p.role === 'artist').slice(0, 20));
      // Popular nominees = sorted by vote count
      setNominees(
        [...allNominees]
          .filter(n => n.nomination_status === 'approved' || n.nomination_status === 'winner')
          .sort((a, b) => (b.total_votes || 0) - (a.total_votes || 0))
          .slice(0, 20)
      );
    } catch { toast.error('Failed to load trending data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRefresh = async () => {
    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') return;
    setRefreshing(true);
    try {
      await computeAndStoreWeeklyTrending();
      await load();
      toast.success('Trending data refreshed');
    } catch { toast.error('Failed to refresh trending'); }
    finally { setRefreshing(false); }
  };

  const handlePlay = async (item: WeeklyTrending) => {
    try {
      if (item.content_type === 'song') {
        const song = await getSongById(item.content_id);
        if (song) playSong(song);
      } else {
        const video = await getVideoById(item.content_id);
        if (video) setCurrentVideo(video);
      }
    } catch { toast.error('Could not load content'); }
  };

  const weeklyEmpty = Object.values(data).every(arr => arr.length === 0);

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <BackToHome />
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-accent" />
            <div>
              <h1 className="text-2xl font-bold">Trending</h1>
              <p className="text-sm text-muted-foreground">Zambia's hottest content right now</p>
            </div>
          </div>
          {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="songs">
            <TabsList className="mb-6 w-full overflow-x-auto whitespace-nowrap flex h-auto gap-0.5">
              <TabsTrigger value="songs" className="flex items-center gap-1.5 shrink-0">
                <Music2 className="h-3.5 w-3.5 text-accent" />
                <span className="hidden sm:inline">🔥 Trending Songs</span>
                <span className="sm:hidden">Songs</span>
              </TabsTrigger>
              <TabsTrigger value="videos" className="flex items-center gap-1.5 shrink-0">
                <VideoIcon className="h-3.5 w-3.5 text-blue-600" />
                <span className="hidden sm:inline">🔥 Trending Videos</span>
                <span className="sm:hidden">Videos</span>
              </TabsTrigger>
              <TabsTrigger value="artists" className="flex items-center gap-1.5 shrink-0">
                <Users className="h-3.5 w-3.5 text-green-600" />
                <span className="hidden sm:inline">🔥 Rising Artists</span>
                <span className="sm:hidden">Artists</span>
              </TabsTrigger>
              <TabsTrigger value="nominees" className="flex items-center gap-1.5 shrink-0">
                <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                <span className="hidden sm:inline">🔥 Popular Nominees</span>
                <span className="sm:hidden">Nominees</span>
              </TabsTrigger>
            </TabsList>

            {/* Trending Songs */}
            <TabsContent value="songs">
              <Tabs defaultValue="most_played">
                <TabsList className="mb-4 flex-wrap h-auto gap-1">
                  {WEEKLY_CATS.map(cat => (
                    <TabsTrigger key={cat.value} value={cat.value} className="flex items-center gap-1.5">
                      <cat.icon className={`h-3.5 w-3.5 ${cat.color}`} />
                      <span className="hidden sm:inline">{cat.label}</span>
                      <span className="sm:hidden">{cat.label.split(' ')[1]}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
                {weeklyEmpty ? (
                  <div className="text-center py-16">
                    <TrendingUp className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No trending data yet. Rankings update weekly.</p>
                  </div>
                ) : (
                  WEEKLY_CATS.map(cat => (
                    <TabsContent key={cat.value} value={cat.value}>
                      {(data[cat.value] || []).filter(i => i.content_type === 'song').length === 0 ? (
                        <p className="text-center text-muted-foreground py-10 text-sm">No song data for this category</p>
                      ) : (
                        <div className="divide-y divide-border/50">
                          {(data[cat.value] || [])
                            .filter(i => i.content_type === 'song')
                            .map(item => <TrendingRow key={item.id} item={item} rank={item.rank} onPlay={handlePlay} />)}
                        </div>
                      )}
                    </TabsContent>
                  ))
                )}
              </Tabs>
            </TabsContent>

            {/* Trending Videos */}
            <TabsContent value="videos">
              <Tabs defaultValue="most_viewed">
                <TabsList className="mb-4 flex-wrap h-auto gap-1">
                  {WEEKLY_CATS.map(cat => (
                    <TabsTrigger key={cat.value} value={cat.value} className="flex items-center gap-1.5">
                      <cat.icon className={`h-3.5 w-3.5 ${cat.color}`} />
                      <span className="hidden sm:inline">{cat.label}</span>
                      <span className="sm:hidden">{cat.label.split(' ')[1]}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
                {weeklyEmpty ? (
                  <div className="text-center py-16">
                    <VideoIcon className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No trending videos yet.</p>
                  </div>
                ) : (
                  WEEKLY_CATS.map(cat => (
                    <TabsContent key={cat.value} value={cat.value}>
                      {(data[cat.value] || []).filter(i => i.content_type === 'video').length === 0 ? (
                        <p className="text-center text-muted-foreground py-10 text-sm">No video data for this category</p>
                      ) : (
                        <div className="divide-y divide-border/50">
                          {(data[cat.value] || [])
                            .filter(i => i.content_type === 'video')
                            .map(item => <TrendingRow key={item.id} item={item} rank={item.rank} onPlay={handlePlay} />)}
                        </div>
                      )}
                    </TabsContent>
                  ))
                )}
              </Tabs>
            </TabsContent>

            {/* Rising Artists */}
            <TabsContent value="artists">
              {artists.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No artists yet. Be the first to join!</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {artists.map((artist, i) => <ArtistRow key={artist.id} artist={artist} rank={i + 1} />)}
                </div>
              )}
            </TabsContent>

            {/* Popular Nominees */}
            <TabsContent value="nominees">
              {nominees.length === 0 ? (
                <div className="text-center py-16">
                  <Trophy className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No nominees yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {nominees.map((nominee, i) => <NomineeRow key={nominee.id} nominee={nominee} rank={i + 1} />)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {currentVideo && <VideoPlayer video={currentVideo} onClose={() => setCurrentVideo(null)} />}
    </div>
  );
}
