import { useState } from 'react';
import { Copy, Check, MessageCircle, Facebook, Music, Video as VideoIcon, Link2, Twitter, Linkedin, Share2, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
  text?: string;
  thumbnailUrl?: string;
  /** If provided, renders a copy-able embed snippet for the song/video ID */
  embedId?: string;
  embedType?: 'song' | 'video' | 'nominee';
}

export default function ShareSheet({ open, onClose, url, title, text, thumbnailUrl, embedId, embedType }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const shareText = text ?? `Check out "${title}" on ZedVevo`;
  const embedSnippet = embedId
    ? `[zedvevo-${embedType ?? 'song'} id="${embedId}"]`
    : null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleCopyEmbed = async () => {
    if (!embedSnippet) return;
    try {
      await navigator.clipboard.writeText(embedSnippet);
      setCopiedEmbed(true);
      toast.success('Embed ID copied!');
      setTimeout(() => setCopiedEmbed(false), 2000);
    } catch {
      toast.error('Failed to copy embed');
    }
  };

  const handleWhatsApp = () => {
    const encoded = encodeURIComponent(`${shareText}\n${url}`);
    window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
  };

  const handleFacebook = () => {
    const encoded = encodeURIComponent(url);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
      '_blank',
      'noopener,noreferrer,width=600,height=400'
    );
  };

  const handleTwitter = () => {
    const encoded = encodeURIComponent(`${shareText}\n${url}`);
    window.open(
      `https://twitter.com/intent/tweet?text=${encoded}`,
      '_blank',
      'noopener,noreferrer,width=600,height=400'
    );
  };

  const handleLinkedIn = () => {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const encodedSummary = encodeURIComponent(shareText);
    window.open(
      `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}&summary=${encodedSummary}`,
      '_blank',
      'noopener,noreferrer,width=600,height=500'
    );
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title, text: shareText, url });
    } catch {
      // user cancelled — silent
    }
  };

  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const iconFor = () => {
    if (embedType === 'nominee') return <Trophy className="h-3 w-3" />;
    if (embedType === 'video') return <VideoIcon className="h-3 w-3" />;
    return <Music className="h-3 w-3" />;
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Share</DialogTitle>
        </DialogHeader>

        {/* Thumbnail preview */}
        {thumbnailUrl && (
          <div className="rounded-lg overflow-hidden aspect-video bg-muted mb-1">
            <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" />
          </div>
        )}
        <p className="text-sm font-medium truncate mb-3">{title}</p>

        {/* Social buttons — 2 rows of 2 */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <button
            onClick={handleWhatsApp}
            className="flex flex-col items-center gap-1.5 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <span className="h-7 w-7 flex items-center justify-center rounded-full bg-[#25D366]/10">
              <MessageCircle className="h-4 w-4 text-[#25D366]" />
            </span>
            <span className="text-[10px] font-medium">WhatsApp</span>
          </button>

          <button
            onClick={handleFacebook}
            className="flex flex-col items-center gap-1.5 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <span className="h-7 w-7 flex items-center justify-center rounded-full bg-[#1877F2]/10">
              <Facebook className="h-4 w-4 text-[#1877F2]" />
            </span>
            <span className="text-[10px] font-medium">Facebook</span>
          </button>

          <button
            onClick={handleTwitter}
            className="flex flex-col items-center gap-1.5 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <span className="h-7 w-7 flex items-center justify-center rounded-full bg-foreground/10">
              <Twitter className="h-4 w-4 text-foreground" />
            </span>
            <span className="text-[10px] font-medium">Twitter / X</span>
          </button>

          <button
            onClick={handleLinkedIn}
            className="flex flex-col items-center gap-1.5 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <span className="h-7 w-7 flex items-center justify-center rounded-full bg-[#0A66C2]/10">
              <Linkedin className="h-4 w-4 text-[#0A66C2]" />
            </span>
            <span className="text-[10px] font-medium">LinkedIn</span>
          </button>
        </div>

        {/* Native share (mobile) */}
        {hasNativeShare && (
          <Button variant="outline" className="w-full h-9 text-xs gap-2 mb-3" onClick={handleNativeShare}>
            <Share2 className="h-3.5 w-3.5" />
            More options…
          </Button>
        )}

        {/* Copy direct link */}
        <p className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
          <Link2 className="h-3 w-3" /> Direct link
        </p>
        <div className="flex gap-2 mb-3">
          <Input
            readOnly
            value={url}
            className="text-xs text-muted-foreground h-9 flex-1 min-w-0"
            onClick={e => (e.target as HTMLInputElement).select()}
          />
          <Button size="sm" variant="outline" className="h-9 px-3 shrink-0" onClick={handleCopy}>
            {copied
              ? <Check className="h-3.5 w-3.5 text-green-500" />
              : <Copy className="h-3.5 w-3.5" />
            }
          </Button>
        </div>

        {/* Embed ID snippet */}
        {embedSnippet && (
          <>
            <p className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
              {iconFor()}
              Share as embed ID
            </p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={embedSnippet}
                className="text-xs text-muted-foreground h-9 flex-1 min-w-0 font-mono"
                onClick={e => (e.target as HTMLInputElement).select()}
              />
              <Button size="sm" variant="outline" className="h-9 px-3 shrink-0" onClick={handleCopyEmbed}>
                {copiedEmbed
                  ? <Check className="h-3.5 w-3.5 text-green-500" />
                  : <Copy className="h-3.5 w-3.5" />
                }
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
