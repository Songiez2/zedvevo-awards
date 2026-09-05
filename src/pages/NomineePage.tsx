import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getNomineeById } from '@/lib/api';
import type { Nominee } from '@/types/index';
import { useOgMeta } from '@/hooks/use-og-meta';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Trophy, ArrowLeft, Share2, Vote } from 'lucide-react';
import BackToHome from '@/components/common/BackToHome';

export default function NomineePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [nominee, setNominee] = useState<Nominee | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    getNomineeById(id)
      .then(n => { if (n) setNominee(n); else setNotFound(true); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  // Share URL points to the edge function so WhatsApp/Facebook crawlers
  // receive real server-rendered OG meta (song title, photo, vote count).
  // Real visitors who click the link are immediately redirected to the SPA.
  const appUrl = nominee
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share?nominee=${nominee.id}`
    : '';

  useOgMeta({
    title: nominee
      ? (nominee.song_title
          ? `${nominee.song_title} — ${nominee.name} · ZedVevo Awards`
          : `${nominee.name} — ZedVevo Awards Nominee`)
      : 'ZedVevo Awards',
    description: nominee
      ? (nominee.bio
          ? nominee.bio.slice(0, 150)
          : nominee.song_title
            ? `"${nominee.song_title}" by ${nominee.name} · ZedVevo Awards 🏆 ${Number(nominee.total_votes ?? 0).toLocaleString()} votes`
            : `Vote for ${nominee.name} at the ZedVevo Awards! 🏆 ${Number(nominee.total_votes ?? 0).toLocaleString()} votes`)
      : 'Vote for your favourite artists at the ZedVevo Awards.',
    imageUrl: nominee?.photo_url ?? undefined,
    pageUrl: appUrl || undefined,
    type: 'profile',
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

  if (notFound || !nominee) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
      <Trophy className="h-12 w-12 text-muted-foreground/30" />
      <p className="text-muted-foreground">Nominee not found.</p>
      <Button variant="outline" onClick={() => navigate('/awards')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Awards
      </Button>
    </div>
  );

  const handleShare = () => {
    const shareUrl = appUrl;
    if (navigator.share) {
      navigator.share({
        title: `Vote for ${nominee.name} — ZedVevo Awards`,
        text: `Support ${nominee.name} at the ZedVevo Awards! 🏆 ${Number(nominee.total_votes ?? 0).toLocaleString()} votes so far.`,
        url: shareUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <BackToHome />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-5">
          {/* Photo */}
          <div className="aspect-square w-full rounded-xl overflow-hidden bg-muted shadow-sm">
            {nominee.photo_url
              ? <img src={nominee.photo_url} alt={nominee.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center">
                  <span className="text-6xl font-bold text-muted-foreground/30">{nominee.name[0]}</span>
                </div>
            }
          </div>

          {/* Meta */}
          <div className="space-y-1">
            <h1 className="text-xl font-semibold leading-tight">{nominee.name}</h1>
            {nominee.song_title && <p className="text-sm text-muted-foreground">{nominee.song_title}</p>}
            <div className="flex items-center gap-1.5 mt-1.5">
              <Vote className="h-4 w-4 text-accent shrink-0" />
              <span className="text-lg font-bold tabular-nums text-accent">{Number(nominee.total_votes ?? 0).toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">votes</span>
            </div>
            {nominee.bio && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{nominee.bio}</p>}
          </div>

          <div className="flex gap-2">
            <Button className="flex-1 gap-2" onClick={() => navigate(`/awards?nominee=${nominee.id}`)}>
              <Vote className="h-4 w-4" /> Vote Now
            </Button>
            <Button variant="outline" size="icon" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" className="w-full" onClick={() => navigate('/awards')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> All Nominees
          </Button>
        </div>
      </div>
    </div>
  );
}
