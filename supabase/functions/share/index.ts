// Edge Function: share
// - GET /share?nominee=<id>  → OG HTML for social crawlers (WhatsApp, Facebook, Twitter)
// - GET /share?song=<id>     → OG HTML for social crawlers
// - GET /share?video=<id>    → OG HTML for social crawlers
// - POST { content_type, content_id } → increments share_count on songs or videos
//
// OG strategy:
//   • Social crawlers (WhatsApp, FB, Twitter) follow the share URL and read <meta> tags
//   • Real visitors are immediately redirected to the SPA via JS + meta-refresh
//   • All content types include: title, artist/name, image (cover/photo/thumbnail), description
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const DEFAULT_IMAGE = 'https://dgugpfpotxwyoiycracf.supabase.co/storage/v1/object/public/thumbnails/og-default.png';
const SITE_URL = 'https://zedvevo.com';
const SITE_NAME = 'ZedVevo';

function buildOgHtml(opts: {
  title: string;
  description: string;
  image: string;
  url: string;         // canonical SPA page URL (where real visitors land)
  shareUrl: string;    // the edge function URL (og:url — where crawlers fetched this page)
  type?: string;
  siteName?: string;
}): string {
  const { title, description, image, url, shareUrl, type = 'website', siteName = SITE_NAME } = opts;
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // WhatsApp / Facebook / Twitter read og:url as the canonical link shown in preview
  // We set og:url to the clean SPA page (e.g. /nominee/xxx) so the link in the preview
  // opens the actual page, while this edge function serves the rich meta to crawlers.
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />

  <!-- Open Graph — read by WhatsApp, Facebook, LinkedIn, Telegram -->
  <meta property="og:site_name"        content="${esc(siteName)}" />
  <meta property="og:type"             content="${esc(type)}" />
  <meta property="og:title"            content="${esc(title)}" />
  <meta property="og:description"      content="${esc(description)}" />
  <meta property="og:image"            content="${esc(image)}" />
  <meta property="og:image:secure_url" content="${esc(image)}" />
  <meta property="og:image:width"      content="1200" />
  <meta property="og:image:height"     content="630" />
  <meta property="og:image:alt"        content="${esc(title)}" />
  <meta property="og:url"              content="${esc(url)}" />

  <!-- Twitter / X Card -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:site"        content="@ZedVevo" />
  <meta name="twitter:title"       content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image"       content="${esc(image)}" />
  <meta name="twitter:url"         content="${esc(url)}" />

  <!-- Immediately redirect real visitors to the SPA page -->
  <meta http-equiv="refresh" content="0; url=${esc(url)}" />
  <link rel="canonical" href="${esc(url)}" />
</head>
<body>
  <p>Redirecting… <a href="${esc(url)}">Click here if not redirected</a></p>
  <script>window.location.replace("${esc(url)}");</script>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase    = createClient(supabaseUrl, serviceKey);

  // ── GET: serve OG HTML for social crawlers ──────────────────────────────────
  if (req.method === 'GET') {
    const reqUrl     = new URL(req.url);
    const nomineeId  = reqUrl.searchParams.get('nominee');
    const songId     = reqUrl.searchParams.get('song');
    const videoId    = reqUrl.searchParams.get('video');

    // ── Nominee share ────────────────────────────────────────────────────────
    if (nomineeId) {
      const { data: nominee } = await supabase
        .from('nominees')
        .select('id, name, bio, photo_url, song_title, song_url, total_votes')
        .eq('id', nomineeId)
        .maybeSingle();

      if (!nominee) return new Response('Not found', { status: 404 });

      // Title shows: "Song Title — Artist Name · ZedVevo Awards"
      const titleParts = [
        nominee.song_title ? nominee.song_title : null,
        nominee.name,
      ].filter(Boolean);
      const title = `${titleParts.join(' — ')} · ZedVevo Awards`;

      // Description: bio first, then vote count info
      const votes = Number(nominee.total_votes ?? 0);
      const desc  = nominee.bio
        ? `${String(nominee.bio).slice(0, 150)}`
        : nominee.song_title
          ? `"${nominee.song_title}" by ${nominee.name} is nominated at the ZedVevo Awards. Cast your vote now! 🏆 ${votes.toLocaleString()} votes so far.`
          : `Vote for ${nominee.name} at the ZedVevo Awards! 🏆 ${votes.toLocaleString()} votes so far.`;

      // Use the nominee photo as OG image (shows as song/artist image in WhatsApp)
      const image    = nominee.photo_url || DEFAULT_IMAGE;
      const pageUrl  = `${SITE_URL}/nominee/${nominee.id}`;
      const shareUrl = `${supabaseUrl}/functions/v1/share?nominee=${nominee.id}`;

      return new Response(
        buildOgHtml({ title, description: desc, image, url: pageUrl, shareUrl, type: 'profile' }),
        { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' } }
      );
    }

    // ── Song share ───────────────────────────────────────────────────────────
    if (songId) {
      const { data: song } = await supabase
        .from('songs')
        .select('id, title, artist_name, featured_artists, cover_url, genre')
        .eq('id', songId)
        .maybeSingle();

      if (!song) return new Response('Not found', { status: 404 });

      const artistLabel = song.featured_artists
        ? `${song.artist_name} ft. ${song.featured_artists}`
        : song.artist_name;

      const title    = `${song.title} — ${artistLabel} | ZedVevo`;
      const desc     = `🎵 Listen to "${song.title}" by ${artistLabel} on ZedVevo — Zambia's music platform.${song.genre ? ` Genre: ${song.genre}.` : ''}`;
      const image    = song.cover_url || DEFAULT_IMAGE;
      const pageUrl  = `${SITE_URL}/song/${song.id}`;
      const shareUrl = `${supabaseUrl}/functions/v1/share?song=${song.id}`;

      return new Response(
        buildOgHtml({ title, description: desc, image, url: pageUrl, shareUrl, type: 'music.song' }),
        { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' } }
      );
    }

    // ── Video share ──────────────────────────────────────────────────────────
    if (videoId) {
      const { data: video } = await supabase
        .from('videos')
        .select('id, title, artist_name, featured_artists, thumbnail_url, genre')
        .eq('id', videoId)
        .maybeSingle();

      if (!video) return new Response('Not found', { status: 404 });

      const artistLabel = video.featured_artists
        ? `${video.artist_name} ft. ${video.featured_artists}`
        : video.artist_name;

      const title    = `${video.title} — ${artistLabel} | ZedVevo`;
      const desc     = `🎬 Watch "${video.title}" by ${artistLabel} on ZedVevo — Zambia's music video platform.${video.genre ? ` Genre: ${video.genre}.` : ''}`;
      // thumbnail_url is the video poster — shows as video thumbnail in WhatsApp preview
      const image    = video.thumbnail_url || DEFAULT_IMAGE;
      const pageUrl  = `${SITE_URL}/video/${video.id}`;
      const shareUrl = `${supabaseUrl}/functions/v1/share?video=${video.id}`;

      return new Response(
        buildOgHtml({ title, description: desc, image, url: pageUrl, shareUrl, type: 'video.other' }),
        { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' } }
      );
    }

    return new Response('Missing query param: nominee, song, or video', { status: 400 });
  }

  // ── POST: increment share_count ─────────────────────────────────────────────
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let payload: { content_type?: string; content_id?: string };
  try { payload = await req.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }

  const { content_type, content_id } = payload;

  if (!content_id || !['song', 'video'].includes(content_type ?? '')) {
    return json({ error: 'content_type (song|video) and content_id are required' }, 400);
  }

  const table = content_type === 'song' ? 'songs' : 'videos';

  const { data: row, error: fetchErr } = await supabase
    .from(table)
    .select('id, share_count')
    .eq('id', content_id)
    .maybeSingle();

  if (fetchErr || !row) {
    console.error('[share] fetch error:', fetchErr?.message);
    return json({ error: 'Content not found' }, 404);
  }

  const { error: updateErr } = await supabase
    .from(table)
    .update({ share_count: (row.share_count ?? 0) + 1 })
    .eq('id', content_id);

  if (updateErr) {
    console.error('[share] update error:', updateErr.message);
    return json({ error: 'Failed to increment share count' }, 500);
  }

  console.log(`[share] ${table} ${content_id} share_count → ${(row.share_count ?? 0) + 1}`);
  return json({ shared: true, share_count: (row.share_count ?? 0) + 1 });
});
