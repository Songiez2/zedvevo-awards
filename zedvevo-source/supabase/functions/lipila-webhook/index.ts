// Supabase Edge Function: lipila-webhook
// ─────────────────────────────────────────────────────────────────────────────
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

// ── email helper (calls send-email edge function internally) ─────────────────
async function sendEmail(supabaseUrl: string, serviceKey: string, payload: {
  to: string; subject: string; html: string; text?: string;
}) {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('[webhook] sendEmail failed:', err);
    }
  } catch (e) {
    console.error('[webhook] sendEmail exception:', e);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') ?? '';
  const supabase    = createClient(supabaseUrl, serviceKey);

  let payload: {
    referenceId?: string;
    currency?: string;
    amount?: number;
    accountNumber?: string;
    status?: string;
    paymentType?: string;
    type?: string;
    identifier?: string;
    message?: string;
    externalId?: string;
    referenceData?: string;
  };

  try { payload = await req.json(); }
  catch {
    console.error('[webhook] failed to parse body');
    return json({ error: 'Invalid payload' }, 400);
  }

  console.log('[webhook] received:', JSON.stringify(payload));

  const { referenceId, status, identifier, message, externalId } = payload;

  if (!referenceId) {
    console.error('[webhook] missing referenceId');
    return json({ error: 'Missing referenceId' }, 400);
  }

  const { data: payment, error: fetchErr } = await supabase
    .from('payments')
    .select('id, user_id, status, payment_type, plan_id')
    .eq('id', referenceId)
    .maybeSingle();

  if (fetchErr || !payment) {
    console.error('[webhook] payment not found:', referenceId, fetchErr?.message);
    return json({ error: 'Payment not found' }, 404);
  }

  if (['completed', 'failed', 'insufficient_funds', 'cancelled'].includes(payment.status)) {
    console.log('[webhook] already terminal:', payment.status);
    return json({ received: true });
  }

  const rawStatus  = String(status ?? '').toLowerCase();
  const rawMessage = String(message ?? '');
  const isSuccess  = rawStatus === 'successful' || rawStatus === 'success';
  const isFailed   = rawStatus === 'failed' || rawStatus === 'failure';
  const isInsufficient = rawMessage.toUpperCase().includes('LOW_BALANCE') ||
    rawMessage.toLowerCase().includes('insufficient');

  let newStatus: string;
  if (isSuccess) newStatus = 'completed';
  else if (isInsufficient) newStatus = 'insufficient_funds';
  else if (isFailed) newStatus = 'failed';
  else {
    console.log('[webhook] non-terminal status:', status);
    return json({ received: true });
  }

  await supabase.from('payments').update({
    status: newStatus,
    lipila_transaction_id: identifier ?? externalId ?? null,
    failure_reason: isFailed ? rawMessage.slice(0, 400) : null,
    updated_at: new Date().toISOString(),
  }).eq('id', referenceId);

  console.log('[webhook] payment', referenceId, '->', newStatus);

  // ── On successful nominee_registration ────────────────────────────────────
  if (newStatus === 'completed' && payment.payment_type === 'nominee_registration') {
    const { data: pmtFull } = await supabase
      .from('payments')
      .select('metadata, user_id')
      .eq('id', referenceId)
      .maybeSingle();

    const meta = pmtFull?.metadata as {
      award_id?: string;
      category_id?: string;
      nominee_name?: string;
      bio?: string;
      photo_url?: string;
      song_title?: string;
      song_url?: string;
      achievements?: string;
      social_links?: string;
      user_id?: string;
    } | null;

    const userId = pmtFull?.user_id ?? meta?.user_id ?? null;

    if (meta?.category_id && meta?.nominee_name) {
      const nomineePayload: Record<string, unknown> = {
        name: meta.nominee_name,
        category_id: meta.category_id,
        payment_id: referenceId,
        registration_status: 'successful',
        nomination_status: 'pending_review',
        total_votes: 0,
      };
      if (userId) nomineePayload.user_id = userId;
      if (meta.bio) nomineePayload.bio = meta.bio;
      if (meta.photo_url) nomineePayload.photo_url = meta.photo_url;
      if (meta.song_title) nomineePayload.song_title = meta.song_title;
      if (meta.song_url) nomineePayload.song_url = meta.song_url;
      if (meta.achievements) nomineePayload.achievements = meta.achievements;
      if (meta.social_links) nomineePayload.social_links = meta.social_links;

      const { data: existing } = await supabase
        .from('nominees').select('id').eq('payment_id', referenceId).maybeSingle();

      let nomId: string | null = existing?.id ?? null;
      let nomErr: { message: string } | null = null;

      if (existing) {
        const { error } = await supabase
          .from('nominees')
          .update({ registration_status: 'successful' })
          .eq('id', existing.id);
        nomErr = error;
      } else {
        const { data: inserted, error } = await supabase
          .from('nominees').insert(nomineePayload).select('id').single();
        nomErr = error;
        nomId = inserted?.id ?? null;
      }

      if (nomErr) {
        console.error('[webhook] nominee upsert error:', nomErr.message);
      } else {
        console.log('[webhook] nominee created/updated:', meta.nominee_name);

        // Notify nominator
        if (userId) {
          await supabase.from('notifications').insert({
            user_id: userId,
            title: '🎤 Nomination Received!',
            message: `Your nomination for "${meta.nominee_name}" is pending review. You'll be notified once approved.`,
            type: 'info',
            notification_type: 'nomination_received',
            link: '/awards',
          });
        }

        // Notify all admins in-app
        const { data: admins } = await supabase
          .from('profiles').select('id').in('role', ['admin', 'super_admin']);
        if (admins && admins.length > 0) {
          await supabase.from('notifications').insert(
            admins.map(a => ({
              user_id: a.id,
              title: '🎤 New Nominee Pending Review',
              message: `"${meta.nominee_name}" has registered as a nominee and is awaiting your approval.`,
              type: 'info',
              notification_type: 'nomination_received',
              link: '/admin',
            }))
          );
        }

        // Email admin
        if (ADMIN_EMAIL) {
          // Get category name for context
          const { data: catData } = await supabase
            .from('award_categories')
            .select('name, awards(name)')
            .eq('id', meta.category_id)
            .maybeSingle();
          const catName   = catData?.name ?? 'Unknown Category';
          const awardName = (catData?.awards as { name?: string } | null)?.name ?? 'Unknown Award';

          await sendEmail(supabaseUrl, serviceKey, {
            to: ADMIN_EMAIL,
            subject: `🎤 New Nominee: ${meta.nominee_name} — Pending Review`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#222">
                <h2 style="border-bottom:1px solid #eee;padding-bottom:12px">
                  🎤 New Nominee Pending Review
                </h2>
                <table style="width:100%;border-collapse:collapse;font-size:14px">
                  <tr><td style="padding:8px 0;color:#666;width:140px">Nominee</td>
                      <td style="padding:8px 0;font-weight:600">${meta.nominee_name}</td></tr>
                  <tr><td style="padding:8px 0;color:#666">Award</td>
                      <td style="padding:8px 0">${awardName}</td></tr>
                  <tr><td style="padding:8px 0;color:#666">Category</td>
                      <td style="padding:8px 0">${catName}</td></tr>
                  ${meta.song_title ? `<tr><td style="padding:8px 0;color:#666">Song</td><td style="padding:8px 0">${meta.song_title}</td></tr>` : ''}
                  ${meta.bio ? `<tr><td style="padding:8px 0;color:#666">Bio</td><td style="padding:8px 0">${meta.bio.slice(0,200)}</td></tr>` : ''}
                  <tr><td style="padding:8px 0;color:#666">Payment ID</td>
                      <td style="padding:8px 0;font-family:monospace;font-size:12px">${referenceId}</td></tr>
                  ${nomId ? `<tr><td style="padding:8px 0;color:#666">Nominee ID</td><td style="padding:8px 0;font-family:monospace;font-size:12px">${nomId}</td></tr>` : ''}
                </table>
                <p style="margin-top:24px">
                  <a href="${supabaseUrl.replace('https://','https://').replace('.supabase.co','')}/admin"
                     style="background:#000;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px">
                    Review in Admin Panel →
                  </a>
                </p>
                <p style="font-size:12px;color:#999;margin-top:24px">
                  Log in to ZedVevo Admin → Nominees tab to approve or reject.
                </p>
              </div>
            `,
          });
        }
      }
    }
  }

  // ── On successful plan payment ─────────────────────────────────────────────
  if (newStatus === 'completed' && payment.payment_type === 'plan' && payment.plan_id) {
    const { data: plan } = await supabase
      .from('upload_plans')
      .select('plan_type, uploads_allowed, validity_days')
      .eq('id', payment.plan_id)
      .maybeSingle();

    if (plan) {
      const now = new Date();
      let expiresAt: string | null = null;
      if (plan.validity_days) {
        const exp = new Date(now);
        exp.setDate(exp.getDate() + plan.validity_days);
        expiresAt = exp.toISOString();
      }

      await supabase
        .from('user_subscriptions')
        .update({ is_active: false })
        .eq('user_id', payment.user_id)
        .eq('is_active', true);

      const { error: subErr } = await supabase.from('user_subscriptions').insert({
        user_id: payment.user_id,
        plan_id: payment.plan_id,
        plan_type: plan.plan_type,
        uploads_allowed: plan.uploads_allowed ?? null,
        uploads_used: 0,
        is_active: true,
        activated_at: now.toISOString(),
        expires_at: expiresAt,
      });

      if (subErr) {
        console.error('[webhook] subscription insert error:', subErr.message);
      } else {
        const { data: newSub } = await supabase
          .from('user_subscriptions').select('id')
          .eq('user_id', payment.user_id).eq('is_active', true)
          .order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (newSub) {
          await supabase.from('payments').update({ subscription_id: newSub.id }).eq('id', referenceId);
        }
      }
    }
  }

  // ── Notifications ──────────────────────────────────────────────────────────
  const notifMap: Record<string, { title: string; message: string; type: string; notification_type: string }> = {
    completed: {
      title: 'Payment Successful',
      message: payment.payment_type === 'plan'
        ? 'Your upload plan is now active. Start uploading your music and videos!'
        : 'Your payment was processed successfully.',
      type: 'success', notification_type: 'payment_success',
    },
    failed: {
      title: 'Payment Failed',
      message: `Payment could not be processed${rawMessage ? ': ' + rawMessage : '. Please try again'}.`,
      type: 'error', notification_type: 'payment_failed',
    },
    insufficient_funds: {
      title: 'Insufficient Funds',
      message: 'Payment failed due to insufficient funds. Please top up your mobile money and try again.',
      type: 'error', notification_type: 'payment_failed',
    },
  };

  const notif = notifMap[newStatus];
  if (notif) {
    await supabase.from('notifications').insert({
      user_id: payment.user_id,
      title: notif.title, message: notif.message,
      type: notif.type, notification_type: notif.notification_type,
    });
  }

  return json({ received: true, status: newStatus });
});

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
    referenceId?: string;
    currency?: string;
    amount?: number;
    accountNumber?: string;
    status?: string;
    paymentType?: string;
    type?: string;
    identifier?: string;
    message?: string;
    externalId?: string;
    referenceData?: string;
  };

  try { payload = await req.json(); }
  catch {
    console.error('[webhook] failed to parse body');
    return json({ error: 'Invalid payload' }, 400);
  }

  console.log('[webhook] received:', JSON.stringify(payload));

  const { referenceId, status, identifier, message, externalId } = payload;

  if (!referenceId) {
    console.error('[webhook] missing referenceId');
    return json({ error: 'Missing referenceId' }, 400);
  }

  // referenceId = our payment.id
  const { data: payment, error: fetchErr } = await supabase
    .from('payments')
    .select('id, user_id, status, payment_type, plan_id')
    .eq('id', referenceId)
    .maybeSingle();

  if (fetchErr || !payment) {
    console.error('[webhook] payment not found:', referenceId, fetchErr?.message);
    return json({ error: 'Payment not found' }, 404);
  }

  // Already terminal — ignore duplicate callbacks
  if (['completed', 'failed', 'insufficient_funds', 'cancelled'].includes(payment.status)) {
    console.log('[webhook] already terminal:', payment.status);
    return json({ received: true });
  }

  // Map Lipila status → our status
  const rawStatus  = String(status ?? '').toLowerCase();
  const rawMessage = String(message ?? '');
  const isSuccess  = rawStatus === 'successful' || rawStatus === 'success';
  const isFailed   = rawStatus === 'failed' || rawStatus === 'failure';
  const isInsufficient = rawMessage.toUpperCase().includes('LOW_BALANCE') ||
    rawMessage.toLowerCase().includes('insufficient');

  let newStatus: string;
  if (isSuccess) newStatus = 'completed';
  else if (isInsufficient) newStatus = 'insufficient_funds';
  else if (isFailed) newStatus = 'failed';
  else {
    console.log('[webhook] non-terminal status:', status);
    return json({ received: true });
  }

  // Update payment record
  await supabase.from('payments').update({
    status: newStatus,
    lipila_transaction_id: identifier ?? externalId ?? null,
    failure_reason: isFailed ? rawMessage.slice(0, 400) : null,
    updated_at: new Date().toISOString(),
  }).eq('id', referenceId);

  console.log('[webhook] payment', referenceId, '->', newStatus);

  // ── On successful nominee_registration: create pending nominee record ────────
  if (newStatus === 'completed' && payment.payment_type === 'nominee_registration') {
    const { data: pmtFull } = await supabase
      .from('payments')
      .select('metadata, user_id')
      .eq('id', referenceId)
      .maybeSingle();

    const meta = pmtFull?.metadata as {
      award_id?: string;
      category_id?: string;
      nominee_name?: string;
      bio?: string;
      photo_url?: string;
      song_title?: string;
      song_url?: string;
      achievements?: string;
      social_links?: string;
      user_id?: string;
    } | null;

    const userId = pmtFull?.user_id ?? meta?.user_id ?? null;

    if (meta?.category_id && meta?.nominee_name) {
      // Build upsert payload — user_id can be null for manual/admin-added nominees
      const nomineePayload: Record<string, unknown> = {
        name: meta.nominee_name,
        category_id: meta.category_id,
        payment_id: referenceId,
        registration_status: 'successful',
        nomination_status: 'pending_review',
        total_votes: 0,
      };
      if (userId) nomineePayload.user_id = userId;
      if (meta.bio) nomineePayload.bio = meta.bio;
      if (meta.photo_url) nomineePayload.photo_url = meta.photo_url;
      if (meta.song_title) nomineePayload.song_title = meta.song_title;
      if (meta.song_url) nomineePayload.song_url = meta.song_url;
      if (meta.achievements) nomineePayload.achievements = meta.achievements;
      if (meta.social_links) nomineePayload.social_links = meta.social_links;

      // Try upsert by payment_id first (idempotent on duplicate callbacks)
      const { data: existing } = await supabase
        .from('nominees').select('id').eq('payment_id', referenceId).maybeSingle();

      let nomErr: { message: string } | null = null;
      if (existing) {
        // Already exists — update registration status in case it was stuck
        const { error } = await supabase
          .from('nominees')
          .update({ registration_status: 'successful' })
          .eq('id', existing.id);
        nomErr = error;
      } else {
        const { error } = await supabase.from('nominees').insert(nomineePayload);
        nomErr = error;
      }

      if (nomErr) {
        console.error('[webhook] nominee upsert error:', nomErr.message);
      } else {
        console.log('[webhook] nominee record created/updated:', meta.nominee_name, 'cat:', meta.category_id);
        // Notify user their registration is received (pending admin review)
        if (userId) {
          await supabase.from('notifications').insert({
            user_id: userId,
            title: '🎤 Nomination Received!',
            message: `Your nomination for "${meta.nominee_name}" is pending review. You'll be notified once it's approved.`,
            type: 'info',
            notification_type: 'nomination_received',
            link: '/awards',
          });
        }
      }
    } else {
      console.error('[webhook] nominee_registration missing required fields. userId:', userId, 'meta:', JSON.stringify(meta));
    }
  }

  // ── On successful plan payment: create user_subscription ──────────────────
  if (newStatus === 'completed' && payment.payment_type === 'plan' && payment.plan_id) {
    const { data: plan } = await supabase
      .from('upload_plans')
      .select('plan_type, uploads_allowed, validity_days')
      .eq('id', payment.plan_id)
      .maybeSingle();

    if (plan) {
      const now = new Date();
      let expiresAt: string | null = null;
      if (plan.validity_days) {
        const exp = new Date(now);
        exp.setDate(exp.getDate() + plan.validity_days);
        expiresAt = exp.toISOString();
      }

      // Deactivate any previous active subscriptions for this user
      await supabase
        .from('user_subscriptions')
        .update({ is_active: false })
        .eq('user_id', payment.user_id)
        .eq('is_active', true);

      // Insert new active subscription — user_subscriptions is the correct table
      const { error: subErr } = await supabase.from('user_subscriptions').insert({
        user_id: payment.user_id,
        plan_id: payment.plan_id,
        plan_type: plan.plan_type,
        uploads_allowed: plan.uploads_allowed ?? null,
        uploads_used: 0,
        is_active: true,
        activated_at: now.toISOString(),
        expires_at: expiresAt,
      });

      if (subErr) {
        console.error('[webhook] subscription insert error:', subErr.message);
      } else {
        console.log('[webhook] subscription activated for user:', payment.user_id, 'plan:', plan.plan_type);
      }

      // Link payment → subscription
      const { data: newSub } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', payment.user_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (newSub) {
        await supabase.from('payments').update({ subscription_id: newSub.id }).eq('id', referenceId);
      }
    }
  }

  // ── Notifications ──────────────────────────────────────────────────────────
  const notifMap: Record<string, { title: string; message: string; type: string; notification_type: string }> = {
    completed: {
      title: 'Payment Successful',
      message: payment.payment_type === 'plan'
        ? 'Your upload plan is now active. Start uploading your music and videos!'
        : 'Your payment was processed successfully.',
      type: 'success',
      notification_type: 'payment_success',
    },
    failed: {
      title: 'Payment Failed',
      message: `Payment could not be processed${rawMessage ? ': ' + rawMessage : '. Please try again'}.`,
      type: 'error',
      notification_type: 'payment_failed',
    },
    insufficient_funds: {
      title: 'Insufficient Funds',
      message: 'Payment failed due to insufficient funds. Please top up your mobile money and try again.',
      type: 'error',
      notification_type: 'payment_failed',
    },
  };

  const notif = notifMap[newStatus];
  if (notif) {
    await supabase.from('notifications').insert({
      user_id: payment.user_id,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      notification_type: notif.notification_type,
    });
  }

  return json({ received: true, status: newStatus });
});
