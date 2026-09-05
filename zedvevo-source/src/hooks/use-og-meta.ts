import { useEffect } from 'react';

// Absolute fallback image hosted on Supabase storage (public, crawlable by bots)
const DEFAULT_OG_IMAGE = 'https://dgugpfpotxwyoiycracf.supabase.co/storage/v1/object/public/thumbnails/og-default.png';

interface OgMetaOptions {
  title: string;
  description: string;
  imageUrl?: string;   // cover / thumbnail / photo URL — must be absolute
  pageUrl?: string;    // canonical share URL
  type?: 'website' | 'music.song' | 'video.other' | 'profile';
}

/**
 * Injects dynamic Open Graph + Twitter Card <meta> tags so that when a
 * song/video/nominee deep-link is shared on WhatsApp, Facebook, Twitter etc.
 * the preview card shows the correct title, cover art and description.
 *
 * Rules:
 * - imageUrl MUST be an absolute https:// URL — relative paths are ignored by crawlers
 * - Falls back to DEFAULT_OG_IMAGE when no image is provided
 * - All injected tags carry data-dynamic="true" so they are removed on cleanup
 */
export function useOgMeta({ title, description, imageUrl, pageUrl, type = 'website' }: OgMetaOptions) {
  useEffect(() => {
    if (!title) return;

    const url = pageUrl ?? window.location.href;

    // Ensure image is always an absolute URL (bots cannot resolve relative paths)
    let image = imageUrl ?? '';
    if (image && image.startsWith('/')) {
      image = `${window.location.origin}${image}`;
    }
    if (!image) image = DEFAULT_OG_IMAGE;

    const tags: [string, string][] = [
      // document title
      ['title', title],
      // OG base
      ['og:title', title],
      ['og:description', description],
      ['og:url', url],
      ['og:type', type],
      // OG image
      ['og:image', image],
      ['og:image:secure_url', image],
      ['og:image:width', '1200'],
      ['og:image:height', '630'],
      ['og:image:alt', title],
      // Twitter
      ['twitter:card', 'summary_large_image'],
      ['twitter:title', title],
      ['twitter:description', description],
      ['twitter:url', url],
      ['twitter:image', image],
    ];

    const originalTitle = document.title;
    const toRestore: Array<{ el: HTMLMetaElement; attr: string; original: string | null }> = [];
    const injected: HTMLMetaElement[] = [];

    for (const [key, value] of tags) {
      if (key === 'title') {
        document.title = value;
        continue;
      }

      const isOg = key.startsWith('og:');
      const attr = isOg ? 'property' : 'name';
      const existing = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);

      if (existing) {
        toRestore.push({ el: existing, attr: 'content', original: existing.getAttribute('content') });
        existing.setAttribute('content', value);
      } else {
        const meta = document.createElement('meta');
        meta.setAttribute(attr, key);
        meta.setAttribute('content', value);
        meta.setAttribute('data-dynamic', 'true');
        document.head.appendChild(meta);
        injected.push(meta);
      }
    }

    return () => {
      document.title = originalTitle;
      for (const { el, attr, original } of toRestore) {
        if (original !== null) el.setAttribute(attr, original);
        else el.removeAttribute(attr);
      }
      for (const el of injected) el.remove();
    };
  }, [title, description, imageUrl, pageUrl, type]);
}
