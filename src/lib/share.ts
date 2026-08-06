/**
 * Canonical share links.
 *
 * `/share/song/:id` and `/share/video/:id` are served by the `api/share`
 * serverless function, which renders real Open Graph tags (title, description
 * and the artist's own uploaded thumbnail) for crawlers and instantly forwards
 * humans to the in-app page. Social apps therefore show the real artwork.
 */
export type ShareKind = 'song' | 'video' | 'nominee';

export function buildShareUrl(kind: ShareKind, id: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/share/${kind}/${id}`;
}
