// Supabase Edge Function: create-donation-checkout
// Uses Lipila mobile-money API (same pattern as lipila-payment function).
// POST body: { amount, phone_number, message?, donor_name? }
// Secrets needed: LIPILA_API_KEY, LIPILA_WEBHOOK_URL (optional), LIPILA_API_URL (optional)

import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

// Normalise Zambian number → 260XXXXXXXXX
function normalisePhone(raw: string): string {
  const clean = raw.replace(/[\s\-\(\)]/g, "");
  if (clean.startsWith("260")) return clean;
  if (clean.startsWith("0")) return "260" + clean.slice(1);
  if (clean.length === 9) return "260" + clean;
  return clean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey    = Deno.env.get("LIPILA_API_KEY") ?? "";
  const webhookUrl = Deno.env.get("LIPILA_WEBHOOK_URL") ?? "";
  const baseUrl   = (Deno.env.get("LIPILA_API_URL") ?? "https://blz.lipila.io").replace(/\/$/, "");
  const endpoint  = `${baseUrl}/api/v1/collections/mobile-money`;

  if (!apiKey) {
    return json({ error: "Payment gateway not configured. Contact support." }, 503);
  }

  // Optional: resolve authenticated user
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  let userId: string | null = null;
  if (token && token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) userId = user.id;
  }

  let body: { amount: number; phone_number: string; message?: string; donor_name?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request body" }, 400); }

  const { amount, phone_number, message, donor_name } = body;
  if (!amount || Number(amount) < 1) return json({ error: "Minimum donation is 1 ZMW" }, 400);
  if (!phone_number) return json({ error: "Phone number is required for mobile money" }, 400);

  const referenceId = crypto.randomUUID();
  const accountNumber = normalisePhone(phone_number);

  // Create pending payment record in payments table
  const { data: payment, error: payErr } = await supabase
    .from("payments")
    .insert({
      user_id: userId,
      amount: Number(amount),
      payment_method: "mobile_money",
      payment_type: "donation",
      status: "pending",
      phone_number: accountNumber,
      idempotency_key: referenceId,
      metadata: { donor_name: donor_name ?? null, message: message ?? null },
    })
    .select()
    .single();

  if (payErr || !payment) {
    console.error("[donation] DB insert failed:", payErr);
    return json({ error: "Failed to create payment record: " + (payErr?.message ?? "unknown") }, 500);
  }

  const payload = {
    referenceId: payment.id,
    amount: Number(amount),
    narration: message ? message.slice(0, 100) : "ZedVevo donation",
    accountNumber,
    currency: "ZMW",
    email: "",
    referenceData: `ZedVevo platform — donation${donor_name ? ` from ${donor_name}` : ""}`,
  };

  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "accept": "application/json",
    "x-api-key": apiKey,
  };
  if (webhookUrl) reqHeaders["callbackUrl"] = webhookUrl;

  try {
    const gwRes = await fetch(endpoint, {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify(payload),
    });

    const gwText = await gwRes.text();
    console.log(`[donation] Lipila response [${gwRes.status}]:`, gwText);

    let gwData: Record<string, unknown> = {};
    try { gwData = JSON.parse(gwText); } catch { /* non-JSON */ }

    if (gwRes.status === 200 || gwRes.status === 201) {
      const gwStatus = String(gwData.status ?? "").toLowerCase();
      if (
        ["pending", "successful", "success"].includes(gwStatus) ||
        String(gwData.message ?? "").toLowerCase().includes("successful")
      ) {
        await supabase.from("payments").update({
          lipila_transaction_id: (gwData.identifier ?? gwData.referenceId ?? null) as string | null,
          lipila_reference: (gwData.referenceId ?? payment.id) as string,
          updated_at: new Date().toISOString(),
        }).eq("id", payment.id);

        return json({
          payment_id: payment.id,
          status: "pending",
          transaction_id: gwData.identifier ?? null,
          message: "Donation request sent. Check your phone for the Mobile Money PIN prompt.",
        });
      }

      const failMsg = String(gwData.message ?? gwData.status ?? "Payment failed");
      await supabase.from("payments").update({
        status: "failed", failure_reason: failMsg, updated_at: new Date().toISOString(),
      }).eq("id", payment.id);
      return json({ error: failMsg, payment_id: payment.id, status: "failed" }, 400);
    }

    const failReason = String(
      (gwData as Record<string, unknown>).message ?? gwData.detail ?? gwData.error ?? `HTTP ${gwRes.status}`
    ).slice(0, 400);
    await supabase.from("payments").update({
      status: "failed", failure_reason: failReason, updated_at: new Date().toISOString(),
    }).eq("id", payment.id);
    return json({ error: failReason, payment_id: payment.id, status: "failed" }, 502);

  } catch (err) {
    console.error("[donation] fetch error:", err);
    await supabase.from("payments").update({
      status: "failed", failure_reason: String(err).slice(0, 500), updated_at: new Date().toISOString(),
    }).eq("id", payment.id);
    return json({ error: "Could not reach payment gateway. Please try again later." }, 500);
  }
});
