// One-time bootstrap function: sets the super admin password via service role.
// This runs with the service-role key so it bypasses RLS entirely.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const adminClient = createClient(supabaseUrl, serviceKey);

  // Find the auth user by email
  const { data: { users }, error: listErr } =
    await adminClient.auth.admin.listUsers();

  if (listErr) {
    return new Response(JSON.stringify({ error: listErr.message }), { status: 500, headers: corsHeaders });
  }

  const target = users.find(u => u.email === 'topkuchalo@gmail.com');

  if (!target) {
    // User doesn't exist — create them
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: 'topkuchalo@gmail.com',
      password: '@0978627981Ps',
      email_confirm: true,
    });
    if (createErr) {
      return new Response(JSON.stringify({ error: createErr.message }), { status: 500, headers: corsHeaders });
    }
    // Insert profile
    await adminClient.from('profiles').upsert({
      id: created.user!.id,
      email: 'topkuchalo@gmail.com',
      username: 'superadmin',
      display_name: 'Super Admin',
      role: 'super_admin',
    }, { onConflict: 'id' });
    return new Response(JSON.stringify({ created: true, id: created.user!.id }), { headers: corsHeaders });
  }

  // User exists — update password + confirm email
  const { error: updateErr } = await adminClient.auth.admin.updateUserById(target.id, {
    password: '@0978627981Ps',
    email_confirm: true,
  });

  if (updateErr) {
    return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: corsHeaders });
  }

  // Ensure profile row is present with super_admin role
  await adminClient.from('profiles').upsert({
    id: target.id,
    email: 'topkuchalo@gmail.com',
    username: 'superadmin',
    display_name: 'Super Admin',
    role: 'super_admin',
  }, { onConflict: 'id' });

  return new Response(JSON.stringify({ updated: true, id: target.id }), { headers: corsHeaders });
});
