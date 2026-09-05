// Supabase Edge Function: verify-donation-payment
// Checks the status of a Lipila donation by querying the payments table.
// The lipila-webhook function updates payment status on callback from Lipila.
// POST body: { payment_id }

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { payment_id } = await req.json();
    if (!payment_id) return json({ error: "Missing payment_id" }, 400);

    const { data: payment, error } = await supabase
      .from("payments")
      .select("id, status, amount, payment_method, payment_type, lipila_transaction_id, failure_reason, metadata")
      .eq("id", payment_id)
      .maybeSingle();

    if (error || !payment) return json({ error: "Payment not found" }, 404);

    const verified = payment.status === "completed" || payment.status === "successful";
    return json({
      verified,
      status: payment.status,
      payment_id: payment.id,
      payment_type: payment.payment_type ?? null,
      amount: payment.amount,
      currency: "ZMW",
      transaction_id: payment.lipila_transaction_id ?? null,
      failure_reason: payment.failure_reason ?? null,
      donor_name: (payment.metadata as Record<string, string> | null)?.donor_name ?? null,
      message: (payment.metadata as Record<string, string> | null)?.message ?? null,
    });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Verification failed" }, 500);
  }
});
