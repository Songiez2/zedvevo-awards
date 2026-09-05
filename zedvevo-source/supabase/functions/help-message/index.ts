// Edge Function: help-message
// Receives a help/support message from any user and:
//   1. Stores it in the help_messages table
//   2. Sends an email to admin
//   3. Creates an in-app notification for all admins

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

  const supabaseUrl    = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const ADMIN_EMAIL    = Deno.env.get('ADMIN_EMAIL') ?? '';
  const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') ?? 'noreply@zedvevo.com';
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';

  const supabase = createClient(supabaseUrl, serviceKey);

  let body: {
    message: string;
    name?: string;
    email?: string;
    user_id?: string;
    subject?: string;
  };

  try { body = await req.json(); }
  catch { return json({ error: 'Invalid payload' }, 400); }

  const { message, name, email, user_id, subject } = body;
  if (!message?.trim()) return json({ error: 'message is required' }, 400);

  const senderName  = name  || 'Anonymous User';
  const senderEmail = email || 'unknown';
  const msgSubject  = subject || 'Help Request';
  const now         = new Date().toISOString();

  // 1. Store in help_messages table
  const { data: stored, error: insertErr } = await supabase
    .from('help_messages')
    .insert({
      user_id:       user_id ?? null,
      name:          senderName,
      email:         senderEmail,
      subject:       msgSubject,
      message:       message.trim(),
      status:        'open',
      created_at:    now,
    })
    .select('id')
    .single();

  if (insertErr) {
    console.error('[help-message] insert error:', insertErr.message);
    // Don't fail — still send email
  }

  const msgId = stored?.id ?? 'N/A';

  // 2. Email admin
  if (ADMIN_EMAIL && RESEND_API_KEY) {
    const htmlBody = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#222">
        <h2 style="color:#000;border-bottom:1px solid #eee;padding-bottom:12px">
          📬 New Help Message — ZedVevo
        </h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:8px 0;color:#666;width:120px">From</td>
              <td style="padding:8px 0;font-weight:600">${senderName}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Email</td>
              <td style="padding:8px 0">${senderEmail}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Subject</td>
              <td style="padding:8px 0">${msgSubject}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Message&nbsp;ID</td>
              <td style="padding:8px 0;font-family:monospace;font-size:12px">${msgId}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Received</td>
              <td style="padding:8px 0">${new Date(now).toLocaleString()}</td></tr>
        </table>
        <div style="margin:20px 0;padding:16px;background:#f9f9f9;border-left:3px solid #000;border-radius:4px">
          <p style="margin:0;white-space:pre-wrap;font-size:14px;line-height:1.6">${message.trim().replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
        </div>
        <p style="font-size:12px;color:#999;margin-top:24px">
          Manage help messages in the Admin Panel → Help Messages tab.
        </p>
      </div>
    `;

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:      `ZedVevo <${FROM_EMAIL}>`,
          to:        [ADMIN_EMAIL],
          subject:   `[Help] ${msgSubject} — from ${senderName}`,
          html:      htmlBody,
          reply_to:  senderEmail !== 'unknown' ? senderEmail : undefined,
        }),
      });
      console.log('[help-message] admin email sent to:', ADMIN_EMAIL);
    } catch (e) {
      console.error('[help-message] email send error:', e);
    }
  }

  // 3. In-app notification for all admins
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'super_admin']);

  if (admins && admins.length > 0) {
    const notifRows = admins.map(a => ({
      user_id:           a.id,
      title:             `📬 New Help Message`,
      message:           `From ${senderName}: "${message.trim().slice(0, 100)}${message.length > 100 ? '…' : ''}"`,
      type:              'info',
      notification_type: 'help_message',
      link:              '/admin',
    }));

    const { error: notifErr } = await supabase.from('notifications').insert(notifRows);
    if (notifErr) console.error('[help-message] notification insert error:', notifErr.message);
  }

  return json({ success: true, id: msgId });
});
