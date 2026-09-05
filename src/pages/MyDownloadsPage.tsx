import BackToHome from '@/components/common/BackToHome';
import { useState, useEffect } from 'react';
import { Download, Music2, Video as VideoIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { getUserDownloads } from '@/lib/api';
import type { Download as DownloadType } from '@/types/index';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

function DownloadRow({ item, onRedownload }: { item: DownloadType; onRedownload: (item: DownloadType) => void }) {
  const Icon = item.content_type === 'song' ? Music2 : VideoIcon;
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors group">
      <div className="h-11 w-11 rounded-md shrink-0 bg-muted overflow-hidden flex items-center justify-center">
        {item.cover_url
          ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
          : <Icon className="h-5 w-5 text-muted-foreground" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        <p className="text-xs text-muted-foreground truncate">{item.artist_name}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{formatDate(item.downloaded_at)}</p>
      </div>
      <Badge variant="outline" className="text-[10px] shrink-0 capitalize hidden sm:inline-flex">
        {item.content_type}
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onRedownload(item)}
        title="Re-download"
      >
        <Download className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default function MyDownloadsPage() {
  const { user } = useAuth();
  const [downloads, setDownloads] = useState<DownloadType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getUserDownloads(user.id)
      .then(setDownloads)
      .catch(() => toast.error('Failed to load downloads'))
      .finally(() => setLoading(false));
  }, [user]);

  const handleRedownload = async (item: DownloadType) => {
    try {
      const a = document.createElement('a');
      a.href = item.file_url;
      a.download = `${item.title} - ${item.artist_name}.${item.content_type === 'song' ? 'mp3' : 'mp4'}`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Download started');
    } catch {
      toast.error('Download failed');
    }
  };

  const songs = downloads.filter(d => d.content_type === 'song');
  const videos = downloads.filter(d => d.content_type === 'video');

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <BackToHome />
        <div className="flex items-center gap-3 mb-8">
          <Download className="h-6 w-6 text-accent" />
          <div>
            <h1 className="text-2xl font-bold">My Downloads</h1>
            <p className="text-sm text-muted-foreground">{downloads.length} item{downloads.length !== 1 ? 's' : ''} downloaded</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : downloads.length === 0 ? (
          <div className="text-center py-20">
            <Download className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No downloads yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Songs and videos you download will appear here</p>
          </div>
        ) : (
          <Tabs defaultValue="all">
            <TabsList className="mb-6">
              <TabsTrigger value="all">All ({downloads.length})</TabsTrigger>
              <TabsTrigger value="music">Music ({songs.length})</TabsTrigger>
              <TabsTrigger value="videos">Videos ({videos.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className="divide-y divide-border/50">
                {downloads.map(d => <DownloadRow key={d.id} item={d} onRedownload={handleRedownload} />)}
              </div>
            </TabsContent>
            <TabsContent value="music">
              {songs.length === 0
                ? <p className="text-center text-muted-foreground py-10 text-sm">No music downloads</p>
                : <div className="divide-y divide-border/50">{songs.map(d => <DownloadRow key={d.id} item={d} onRedownload={handleRedownload} />)}</div>
              }
            </TabsContent>
            <TabsContent value="videos">
              {videos.length === 0
                ? <p className="text-center text-muted-foreground py-10 text-sm">No video downloads</p>
                : <div className="divide-y divide-border/50">{videos.map(d => <DownloadRow key={d.id} item={d} onRedownload={handleRedownload} />)}</div>
              }
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
