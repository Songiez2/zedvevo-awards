/**
 * Open Graph share endpoint (Vercel serverless).
 *
 * Crawlers (WhatsApp, Facebook, X, Telegram) do not run JavaScript, so a SPA
 * link never shows real artwork. This endpoint renders static meta tags with
 * the item's own uploaded thumbnail and redirects real visitors into the app.
 */
type Req = { query: Record<string, string | string[] | undefined>; url?: string };
type Res = {
  setHeader: (k: string, v: string) => void;
  status: (code: number) => Res;
  send: (body: string) => void;
};

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  '';

const esc = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || '';

async function fetchItem(kind: string, id: string) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const table = kind === 'video' ? 'videos' : kind === 'nominee' ? 'nominees' : 'songs';
  const cols =
    kind === 'nominee'
      ? 'id,name,song_title,photo_url,total_votes'
      : 'id,title,artist_name,description,cover_url,thumbnail_url';
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&select=${cols}&limit=1`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as Record<string, string>[];
  return rows?.[0] ?? null;
}

export default async function handler(req: Req, res: Res) {
  const kind = first(req.query.type) || 'song';
  const id = first(req.query.id);
  const origin = process.env.PUBLIC_SITE_URL || 'https://zedvevo.com';

  let title = 'ZedVevo';
  let description = 'Stream Zambian music and videos on ZedVevo.';
  let image = `${origin}/og-default.jpg`;
  let target = origin;

  try {
    const item = await fetchItem(kind, id);
    if (item) {
      if (kind === 'nominee') {
        title = `${item.name} — ZedVevo Awards`;
        description = `Vote for ${item.name}${item.song_title ? ` (${item.song_title})` : ''} in the ZedVevo Awards.`;
        image = item.photo_url || image;
        target = `${origin}/awards?nominee=${encodeURIComponent(id)}`;
      } else {
        const isVideo = kind === 'video';
        title = `${item.title} — ${item.artist_name || 'ZedVevo'}`;
        description = item.description || `Listen to "${item.title}" by ${item.artist_name || 'ZedVevo'} on ZedVevo.`;
        image = item.thumbnail_url || item.cover_url || image;
        target = `${origin}/${isVideo ? 'videos' : 'music'}?id=${encodeURIComponent(id)}`;
      }
    }
  } catch {
    /* fall through to defaults */
  }

  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${esc(target)}" />
<meta property="og:site_name" content="ZedVevo" />
<meta property="og:type" content="${kind === 'video' ? 'video.other' : 'music.song'}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:image:secure_url" content="${esc(image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${esc(target)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(image)}" />
<meta http-equiv="refresh" content="0; url=${esc(target)}" />
</head><body>
<p>Redirecting to <a href="${esc(target)}">${esc(title)}</a>…</p>
<script>window.location.replace(${JSON.stringify(target)});</script>
</body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
  res.status(200).send(html);
}
