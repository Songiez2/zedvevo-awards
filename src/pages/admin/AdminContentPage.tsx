import { useEffect, useState } from 'react';
import { Search, Trash2, CheckCircle2, XCircle, TrendingUp, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { getSongs, getVideos, approveContent, rejectContent, setTrending, deleteSong, deleteVideo, setVideoDownloadsEnabled, updateSong } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Song, Video as VideoType } from '@/types/index';

type Status = 'all' | 'pending' | 'approved' | 'rejected';

export default function AdminContentPage() {
  const [songs, setSongs]         = useState<Song[]>([]);
  const [videos, setVideos]       = useState<VideoType[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<Status>('all');

  useEffect(() => {
    Promise.all([getSongs({ limit: 500 }), getVideos({ limit: 500 })])
      .then(([s, v]) => { setSongs(s); setVideos(v); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filterItems = <T extends { title: string; artist_name: string; status: string }>(items: T[]) =>
    items.filter(item => {
      const q = search.toLowerCase();
      const matchSearch = !q || item.title.toLowerCase().includes(q) || item.artist_name.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchSearch && matchStatus;
    });

  const statusBadge = (status: string) => (
    <Badge
      variant={status === 'approved' ? 'default' : status === 'rejected' ? 'destructive' : 'secondary'}
      className="text-[10px] capitalize"
    >{status}</Badge>
  );

  const editSong = async (song: Song) => {
    const title = window.prompt('Song title', song.title);
    if (title === null || !title.trim()) return;
    const coverUrl = window.prompt('Public cover image URL (leave unchanged to keep current cover)', song.cover_url || '');
    if (coverUrl === null) return;
    try {
      await updateSong(song.id, { title: title.trim(), cover_url: coverUrl.trim() || undefined });
      setSongs(previous => previous.map(item => item.id === song.id ? { ...item, title: title.trim(), cover_url: coverUrl.trim() || undefined } : item));
      toast.success('Song details updated');
    } catch { toast.error('Could not update the song'); }
  };

  const SongsTable = () => {
    const items = filterItems(songs);
    return (
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-muted/40">
            <tr>
              {['Title', 'Artist', 'Genre', 'Plays', 'Status', 'Trending', 'Actions'].map(h => (
                <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-t border-border">
                <td colSpan={7} className="px-3 py-2"><Skeleton className="h-5 w-full" /></td>
              </tr>
            )) : items.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-muted-foreground text-xs">No songs found</td></tr>
            ) : items.map(song => (
              <tr key={song.id} className="border-t border-border hover:bg-muted/30">
                <td className="py-2.5 px-3 max-w-[160px] truncate font-medium whitespace-nowrap">{song.title}</td>
                <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{song.artist_name}</td>
                <td className="py-2.5 px-3 text-muted-foreground text-xs whitespace-nowrap">{song.genre || '—'}</td>
                <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{song.play_count || 0}</td>
                <td className="py-2.5 px-3 whitespace-nowrap">{statusBadge(song.status)}</td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <Switch checked={song.is_trending} onCheckedChange={async v => {
                    await setTrending('songs', song.id, v);
                    setSongs(p => p.map(s => s.id === song.id ? { ...s, is_trending: v } : s));
                  }} />
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit title and cover" onClick={() => editSong(song)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {song.status === 'pending' && (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" title="Approve"
                          onClick={async () => { await approveContent('songs', song.id); setSongs(p => p.map(s => s.id === song.id ? { ...s, status: 'approved' as const } : s)); toast.success('Approved'); }}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Reject"
                          onClick={async () => { await rejectContent('songs', song.id); setSongs(p => p.map(s => s.id === song.id ? { ...s, status: 'rejected' as const } : s)); toast.success('Rejected'); }}>
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Delete"
                      onClick={async () => { if (!confirm('Delete song?')) return; await deleteSong(song.id); setSongs(p => p.filter(s => s.id !== song.id)); toast.success('Deleted'); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const VideosTable = () => {
    const items = filterItems(videos);
    return (
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted/40">
            <tr>
              {['Title', 'Artist', 'Views', 'Status', 'Trending', 'Downloads', 'Uploaded', 'Actions'].map(h => (
                <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-t border-border">
                <td colSpan={8} className="px-3 py-2"><Skeleton className="h-5 w-full" /></td>
              </tr>
            )) : items.length === 0 ? (
              <tr><td colSpan={8} className="py-10 text-center text-muted-foreground text-xs">No videos found</td></tr>
            ) : items.map(video => (
              <tr key={video.id} className="border-t border-border hover:bg-muted/30">
                <td className="py-2.5 px-3 max-w-[160px] truncate font-medium whitespace-nowrap">{video.title}</td>
                <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{video.artist_name}</td>
                <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{video.view_count || 0}</td>
                <td className="py-2.5 px-3 whitespace-nowrap">{statusBadge(video.status)}</td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <Switch checked={video.is_trending} onCheckedChange={async v => {
                    await setTrending('videos', video.id, v);
                    setVideos(p => p.map(vi => vi.id === video.id ? { ...vi, is_trending: v } : vi));
                  }} />
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <Switch checked={!!video.downloads_enabled} onCheckedChange={async v => {
                    await setVideoDownloadsEnabled(video.id, v);
                    setVideos(p => p.map(vi => vi.id === video.id ? { ...vi, downloads_enabled: v } : vi));
                  }} />
                </td>
                <td className="py-2.5 px-3 text-muted-foreground text-xs whitespace-nowrap">{formatDate(video.created_at)}</td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <div className="flex gap-1">
                    {video.status === 'pending' && (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" title="Approve"
                          onClick={async () => { await approveContent('videos', video.id); setVideos(p => p.map(vi => vi.id === video.id ? { ...vi, status: 'approved' as const } : vi)); toast.success('Approved'); }}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Reject"
                          onClick={async () => { await rejectContent('videos', video.id); setVideos(p => p.map(vi => vi.id === video.id ? { ...vi, status: 'rejected' as const } : vi)); toast.success('Rejected'); }}>
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Delete"
                      onClick={async () => { if (!confirm('Delete video?')) return; await deleteVideo(video.id); setVideos(p => p.filter(vi => vi.id !== video.id)); toast.success('Deleted'); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Content</h1>
        <p className="text-sm text-muted-foreground">{songs.length} songs · {videos.length} videos</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search title or artist…" className="pl-9 h-8 text-sm"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as Status)}>
          <SelectTrigger className="h-8 text-sm w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <TrendingUp className="h-3.5 w-3.5" />
          Toggle to set trending
        </div>
      </div>

      <Tabs defaultValue="songs">
        <TabsList className="h-8">
          <TabsTrigger value="songs" className="text-xs">Songs ({songs.length})</TabsTrigger>
          <TabsTrigger value="videos" className="text-xs">Videos ({videos.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="songs" className="mt-4"><SongsTable /></TabsContent>
        <TabsContent value="videos" className="mt-4"><VideosTable /></TabsContent>
      </Tabs>
    </div>
  );
}
