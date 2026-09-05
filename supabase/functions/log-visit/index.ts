// Edge Function: log-visit
// Receives a page visit from the client and inserts into visitor_logs.
// Running server-side avoids the direct-from-browser CORS issue.
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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase    = createClient(supabaseUrl, serviceKey);

  let payload: {
    page?: string;
    session_id?: string;
    user_agent?: string;
    referrer?: string;
  };

  try { payload = await req.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }

  const page       = (payload.page ?? '/').slice(0, 200);
  const session_id = (payload.session_id ?? '').slice(0, 64) || undefined;
  const user_agent = (payload.user_agent ?? '').slice(0, 200) || undefined;
  const referrer   = (payload.referrer ?? '').slice(0, 200) || undefined;

  const { error } = await supabase.from('visitor_logs').insert({
    page,
    session_id,
    user_agent,
    referrer,
  });

  if (error) {
    console.error('[log-visit] insert error:', error.message);
    return json({ error: 'Failed to log visit' }, 500);
  }

  // Async refresh daily totals (non-blocking — best-effort)
  supabase.rpc('refresh_daily_visit_totals').then(() => {}).catch(() => {});

  return json({ logged: true });
});
