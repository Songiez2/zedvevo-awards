import BackToHome from '@/components/common/BackToHome';
import { useState, useEffect } from 'react';
import { TrendingUp, Music2, Video as VideoIcon, Heart, Download, Play, Eye, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { getWeeklyTrending, computeAndStoreWeeklyTrending, getSongById, getVideoById } from '@/lib/api';
import type { WeeklyTrending, Video } from '@/types/index';
import { useAuth } from '@/contexts/AuthContext';
import VideoPlayer from '@/components/video/VideoPlayer';
import { toast } from 'sonner';
import { usePlayer } from '@/contexts/PlayerContext';

const CATEGORIES = [
  { value: 'most_played', label: 'Most Played', icon: Play, color: 'text-accent' },
  { value: 'most_downloaded', label: 'Most Downloaded', icon: Download, color: 'text-green-600' },
  { value: 'most_viewed', label: 'Most Viewed', icon: Eye, color: 'text-blue-600' },
  { value: 'most_liked', label: 'Most Liked', icon: Heart, color: 'text-red-500' },
];

function TrendingRow({
  item, rank, onPlay
}: {
  item: WeeklyTrending;
  rank: number;
  onPlay: (item: WeeklyTrending) => void;
}) {
  const Icon = item.content_type === 'song' ? Music2 : VideoIcon;
  return (
    <div
      className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/40 cursor-pointer transition-colors group"
      onClick={() => onPlay(item)}
    >
      <span className={`text-lg font-bold w-7 text-center shrink-0 ${rank <= 3 ? 'text-accent' : 'text-muted-foreground/40'}`}>
        {rank}
      </span>
      <div className="h-11 w-11 rounded-md shrink-0 overflow-hidden bg-muted flex items-center justify-center">
        {item.cover_url
          ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
          : <Icon className="h-5 w-5 text-muted-foreground" />
        }
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

export default function TrendingPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<Record<string, WeeklyTrending[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const { playSong } = usePlayer();

  const load = async () => {
    setLoading(true);
    try {
      const [played, downloaded, viewed, liked] = await Promise.all([
        getWeeklyTrending('most_played'),
        getWeeklyTrending('most_downloaded'),
        getWeeklyTrending('most_viewed'),
        getWeeklyTrending('most_liked'),
      ]);
      setData({ most_played: played, most_downloaded: downloaded, most_viewed: viewed, most_liked: liked });
    } catch { toast.error('Failed to load trending data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRefresh = async () => {
    if (profile?.role !== 'admin') return;
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

  const isEmpty = Object.values(data).every(arr => arr.length === 0);

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <BackToHome />
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-accent" />
            <div>
              <h1 className="text-2xl font-bold">Weekly Trending</h1>
              <p className="text-sm text-muted-foreground">Top content this week</p>
            </div>
          </div>
          {profile?.role === 'admin' && (
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
        ) : isEmpty ? (
          <div className="text-center py-20">
            <TrendingUp className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No trending data yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Weekly rankings are calculated automatically</p>
          </div>
        ) : (
          <Tabs defaultValue="most_played">
            <TabsList className="mb-6 flex-wrap h-auto gap-1">
              {CATEGORIES.map(cat => (
                <TabsTrigger key={cat.value} value={cat.value} className="flex items-center gap-1.5">
                  <cat.icon className={`h-3.5 w-3.5 ${cat.color}`} />
                  <span className="hidden sm:inline">{cat.label}</span>
                  <span className="sm:hidden">{cat.label.split(' ')[1]}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {CATEGORIES.map(cat => (
              <TabsContent key={cat.value} value={cat.value}>
                {(data[cat.value] || []).length === 0 ? (
                  <p className="text-center text-muted-foreground py-10 text-sm">No data for this category</p>
                ) : (
                  <div className="divide-y divide-border/50">
                    {(data[cat.value] || []).map(item => (
                      <TrendingRow key={item.id} item={item} rank={item.rank} onPlay={handlePlay} />
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>

      {currentVideo && (
        <VideoPlayer video={currentVideo} onClose={() => setCurrentVideo(null)} />
      )}
    </div>
  );
}
