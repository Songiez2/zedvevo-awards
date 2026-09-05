// Edge Function: admin-reset-password
// Only callable by authenticated super_admin users.
// Sets a new password for any user account via the Supabase Admin API.

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

  const supabaseUrl     = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const adminClient     = createClient(supabaseUrl, serviceKey);

  // Verify caller is authenticated
  const authHeader = req.headers.get('Authorization') ?? '';
  const callerJwt  = authHeader.replace('Bearer ', '');
  if (!callerJwt) return json({ error: 'Unauthorized' }, 401);

  const { data: { user: caller }, error: authErr } =
    await adminClient.auth.getUser(callerJwt);
  if (authErr || !caller) return json({ error: 'Unauthorized' }, 401);

  // Verify caller is super_admin in profiles table
  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .maybeSingle();

  if (callerProfile?.role !== 'super_admin') {
    return json({ error: 'Forbidden: super_admin only' }, 403);
  }

  // Parse body
  let targetUserId: string;
  let newPassword: string;
  try {
    const body = await req.json();
    targetUserId = body.user_id;
    newPassword  = body.new_password;
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  if (!targetUserId || !newPassword) {
    return json({ error: 'user_id and new_password are required' }, 400);
  }
  if (newPassword.length < 8) {
    return json({ error: 'Password must be at least 8 characters' }, 400);
  }

  // Use admin API to update the password
  const { error: updateErr } = await adminClient.auth.admin.updateUserById(
    targetUserId,
    { password: newPassword }
  );

  if (updateErr) {
    console.error('[reset-password] error:', updateErr.message);
    return json({ error: updateErr.message }, 500);
  }

  console.log(`[reset-password] super_admin ${caller.id} reset password for user ${targetUserId}`);
  return json({ success: true });
});
