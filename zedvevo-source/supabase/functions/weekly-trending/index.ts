import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const [topPlayed, topDownloaded, topViewed, topLiked] = await Promise.all([
      supabase.from('songs').select('id,title,artist_name,cover_url,play_count').eq('status','approved').order('play_count',{ascending:false}).limit(10),
      supabase.from('songs').select('id,title,artist_name,cover_url,download_count').eq('status','approved').order('download_count',{ascending:false}).limit(10),
      supabase.from('videos').select('id,title,artist_name,thumbnail_url,view_count').eq('status','approved').order('view_count',{ascending:false}).limit(10),
      supabase.from('songs').select('id,title,artist_name,cover_url,like_count').eq('status','approved').order('like_count',{ascending:false}).limit(10),
    ]);

    const rows: Record<string, unknown>[] = [];
    (topPlayed.data||[]).forEach((s,i) => rows.push({week_start:weekStartStr,content_id:s.id,content_type:'song',rank:i+1,category:'most_played',metric_value:s.play_count??0,title:s.title,artist_name:s.artist_name,cover_url:s.cover_url}));
    (topDownloaded.data||[]).forEach((s,i) => rows.push({week_start:weekStartStr,content_id:s.id,content_type:'song',rank:i+1,category:'most_downloaded',metric_value:s.download_count??0,title:s.title,artist_name:s.artist_name,cover_url:s.cover_url}));
    (topViewed.data||[]).forEach((v,i) => rows.push({week_start:weekStartStr,content_id:v.id,content_type:'video',rank:i+1,category:'most_viewed',metric_value:v.view_count??0,title:v.title,artist_name:v.artist_name,cover_url:v.thumbnail_url}));
    (topLiked.data||[]).forEach((s,i) => rows.push({week_start:weekStartStr,content_id:s.id,content_type:'song',rank:i+1,category:'most_liked',metric_value:s.like_count??0,title:s.title,artist_name:s.artist_name,cover_url:s.cover_url}));

    if (rows.length > 0) {
      const { error } = await supabase.from('weekly_trending').upsert(rows, {
        onConflict: 'week_start,content_type,category,rank',
        ignoreDuplicates: false,
      });
      if (error) throw error;
    }

    // Notify users about new weekly trends
    const topSong = topPlayed.data?.[0];
    const topVideo = topViewed.data?.[0];
    if (topSong) {
      await supabase.from('notifications').insert({
        title: '📈 This Week\'s Most Played',
        message: `"${topSong.title}" by ${topSong.artist_name} is the most played song this week!`,
        type: 'info',
        notification_type: 'weekly_trending',
        link: '/trending',
        user_id: null,
      });
    }
    if (topVideo) {
      await supabase.from('notifications').insert({
        title: '🎬 Trending Video This Week',
        message: `"${topVideo.title}" by ${topVideo.artist_name} is the most viewed video this week!`,
        type: 'info',
        notification_type: 'weekly_trending',
        link: '/trending',
        user_id: null,
      });
    }

    return new Response(JSON.stringify({ success: true, rows_upserted: rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
