// Supabase Edge Function: generate-thumbnail
// Extracts a thumbnail from an uploaded video URL

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let body: { video_url: string; user_id: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { video_url, user_id } = body;
  if (!video_url || !user_id) {
    return new Response(JSON.stringify({ error: 'Missing video_url or user_id' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // For now: return a default placeholder thumbnail
  // In production you would use ffmpeg / a video processing service
  const placeholder = `https://images.unsplash.com/photo-1598387993441-a364f854cfba?w=640&h=360&fit=crop&q=80`;

  // Future: use Cloudflare Workers or a video extraction API
  // const thumbnailBuffer = await extractFrame(video_url, 5); // 5 seconds
  // const path = `${user_id}/thumb_${Date.now()}.jpg`;
  // await supabase.storage.from('thumbnails').upload(path, thumbnailBuffer);
  // const { data } = supabase.storage.from('thumbnails').getPublicUrl(path);
  // return data.publicUrl;

  return new Response(JSON.stringify({ thumbnail_url: placeholder }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
