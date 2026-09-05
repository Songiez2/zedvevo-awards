// Edge Function: send-email
// Sends transactional emails via Resend API.
// Called internally by other edge functions — NOT exposed publicly.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') ?? 'noreply@zedvevo.com';

  if (!RESEND_API_KEY) {
    console.error('[send-email] RESEND_API_KEY not set');
    return json({ error: 'Email service not configured' }, 500);
  }

  let payload: EmailPayload;
  try { payload = await req.json(); }
  catch { return json({ error: 'Invalid payload' }, 400); }

  const { to, subject, html, text, replyTo } = payload;
  if (!to || !subject || !html) {
    return json({ error: 'to, subject, html are required' }, 400);
  }

  try {
    const body: Record<string, unknown> = {
      from: `ZedVevo <${FROM_EMAIL}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    };
    if (text)    body.text    = text;
    if (replyTo) body.reply_to = replyTo;

    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error('[send-email] Resend error:', JSON.stringify(result));
      return json({ error: result?.message ?? 'Send failed' }, res.status);
    }

    console.log('[send-email] sent to:', to, 'id:', result.id);
    return json({ success: true, id: result.id });
  } catch (e) {
    console.error('[send-email] unexpected error:', e);
    return json({ error: 'Unexpected error' }, 500);
  }
});
