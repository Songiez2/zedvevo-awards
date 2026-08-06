-- ============================================================
-- 00017 — MANUAL PAYMENTS (WhatsApp approval flow)
-- Adds: manual_payments table, storage bucket for proofs,
--       admin approval RPC, payment-mode settings.
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.manual_payment_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.manual_service_type AS ENUM ('nominee_registration', 'vote', 'music_upload', 'video_upload');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.manual_payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_type public.manual_service_type NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'ZMW',
  payer_name text NOT NULL,
  payer_phone text NOT NULL,
  payment_reference text NOT NULL,
  proof_url text,
  proof_mime text,
  notes text,
  -- Service payload: award_id / category_id / nominee_name / nominee_id /
  -- vote_count / plan_id / plan_type — validated on approval.
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.manual_payment_status NOT NULL DEFAULT 'pending',
  submitted_to_whatsapp boolean NOT NULL DEFAULT false,
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS manual_payments_user_idx   ON public.manual_payments (user_id);
CREATE INDEX IF NOT EXISTS manual_payments_status_idx ON public.manual_payments (status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS manual_payments_ref_idx
  ON public.manual_payments (lower(payment_reference)) WHERE status <> 'rejected';

-- ── Grants (PostgREST needs these explicitly) ────────────────
GRANT SELECT, INSERT, UPDATE ON public.manual_payments TO authenticated;
GRANT ALL ON public.manual_payments TO service_role;

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.manual_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own manual payments" ON public.manual_payments;
CREATE POLICY "Users insert own manual payments"
  ON public.manual_payments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Users read own manual payments" ON public.manual_payments;
CREATE POLICY "Users read own manual payments"
  ON public.manual_payments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Users update own pending manual payments" ON public.manual_payments;
CREATE POLICY "Users update own pending manual payments"
  ON public.manual_payments FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Admins manage manual payments" ON public.manual_payments;
CREATE POLICY "Admins manage manual payments"
  ON public.manual_payments FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_manual_payment()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS manual_payments_touch ON public.manual_payments;
CREATE TRIGGER manual_payments_touch BEFORE UPDATE ON public.manual_payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_manual_payment();

-- ── Storage bucket for proof-of-payment files ────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-proofs', 'payment-proofs', false, 5242880,
        ARRAY['image/jpeg','image/jpg','image/png','application/pdf'])
ON CONFLICT (id) DO UPDATE
  SET file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users upload own payment proofs" ON storage.objects;
CREATE POLICY "Users upload own payment proofs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users read own payment proofs" ON storage.objects;
CREATE POLICY "Users read own payment proofs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs'
         AND ((storage.foldername(name))[1] = auth.uid()::text
              OR public.get_user_role(auth.uid()) = 'admin'));

-- ── Approval RPC: verifies admin, then activates the service ─
CREATE OR REPLACE FUNCTION public.approve_manual_payment(p_id uuid)
RETURNS public.manual_payments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  mp          public.manual_payments;
  v_payment   public.payments;
  v_plan      public.upload_plans;
  v_sub_id    uuid;
  v_votes     integer;
BEGIN
  IF public.get_user_role(auth.uid()) <> 'admin' THEN
    RAISE EXCEPTION 'Only admins can approve manual payments';
  END IF;

  SELECT * INTO mp FROM public.manual_payments WHERE id = p_id FOR UPDATE;
  IF mp.id IS NULL THEN RAISE EXCEPTION 'Manual payment not found'; END IF;
  IF mp.status <> 'pending' THEN RAISE EXCEPTION 'Manual payment already %', mp.status; END IF;

  -- Mirror into the main payments ledger
  INSERT INTO public.payments (
    user_id, amount, payment_method, lipila_reference, payment_type,
    status, phone_number, metadata, idempotency_key
  ) VALUES (
    mp.user_id, mp.amount, 'mobile_money', mp.payment_reference,
    CASE WHEN mp.service_type = 'nominee_registration' THEN 'nominee_registration'
         WHEN mp.service_type = 'vote' THEN 'vote'
         ELSE 'plan' END,
    'successful', mp.payer_phone,
    mp.metadata || jsonb_build_object('manual_payment_id', mp.id, 'channel', 'manual_whatsapp'),
    'manual_' || mp.id::text
  ) RETURNING * INTO v_payment;

  IF mp.service_type = 'nominee_registration' THEN
    INSERT INTO public.nominees (user_id, category_id, name, song_title, photo_url, payment_id, registration_status)
    VALUES (
      mp.user_id,
      (mp.metadata->>'category_id')::uuid,
      COALESCE(mp.metadata->>'nominee_name', mp.payer_name),
      NULLIF(mp.metadata->>'song_title', ''),
      NULLIF(mp.metadata->>'photo_url', ''),
      v_payment.id, 'successful'
    )
    ON CONFLICT (user_id, category_id) DO UPDATE
      SET registration_status = 'successful', payment_id = v_payment.id;

  ELSIF mp.service_type = 'vote' THEN
    v_votes := GREATEST(COALESCE((mp.metadata->>'vote_count')::integer, 1), 1);
    INSERT INTO public.votes (user_id, nominee_id, category_id, amount, vote_count, payment_id, payment_status)
    VALUES (
      mp.user_id,
      (mp.metadata->>'nominee_id')::uuid,
      (mp.metadata->>'category_id')::uuid,
      mp.amount, v_votes, v_payment.id, 'successful'
    );
    UPDATE public.nominees
       SET total_votes = total_votes + v_votes
     WHERE id = (mp.metadata->>'nominee_id')::uuid;

  ELSE -- music_upload / video_upload → activate the upload plan
    SELECT * INTO v_plan FROM public.upload_plans WHERE id = (mp.metadata->>'plan_id')::uuid;
    IF v_plan.id IS NULL THEN RAISE EXCEPTION 'Upload plan not found for this payment'; END IF;

    UPDATE public.user_subscriptions SET is_active = false
     WHERE user_id = mp.user_id AND is_active = true;

    INSERT INTO public.user_subscriptions (
      user_id, plan_id, plan_type, uploads_used, uploads_allowed,
      activated_at, expires_at, is_active
    ) VALUES (
      mp.user_id, v_plan.id, v_plan.plan_type, 0, v_plan.uploads_allowed,
      now(),
      CASE WHEN v_plan.validity_days IS NULL THEN NULL
           ELSE now() + (v_plan.validity_days || ' days')::interval END,
      true
    ) RETURNING id INTO v_sub_id;

    UPDATE public.payments
       SET plan_id = v_plan.id, subscription_id = v_sub_id
     WHERE id = v_payment.id;
  END IF;

  UPDATE public.manual_payments
     SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), rejection_reason = NULL
   WHERE id = mp.id
  RETURNING * INTO mp;

  INSERT INTO public.notifications (user_id, title, message, type, notification_type)
  VALUES (mp.user_id, 'Payment approved',
          'Your manual payment (' || mp.payment_reference || ') was approved and your service is now active.',
          'success', 'payment');

  RETURN mp;
END $$;

CREATE OR REPLACE FUNCTION public.reject_manual_payment(p_id uuid, p_reason text)
RETURNS public.manual_payments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE mp public.manual_payments;
BEGIN
  IF public.get_user_role(auth.uid()) <> 'admin' THEN
    RAISE EXCEPTION 'Only admins can reject manual payments';
  END IF;

  UPDATE public.manual_payments
     SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(),
         rejection_reason = COALESCE(NULLIF(p_reason, ''), 'Payment could not be verified')
   WHERE id = p_id AND status = 'pending'
  RETURNING * INTO mp;

  IF mp.id IS NULL THEN RAISE EXCEPTION 'Manual payment not found or already reviewed'; END IF;

  INSERT INTO public.notifications (user_id, title, message, type, notification_type)
  VALUES (mp.user_id, 'Payment rejected',
          'Your manual payment (' || mp.payment_reference || ') was rejected: ' || mp.rejection_reason,
          'error', 'payment');

  RETURN mp;
END $$;

REVOKE ALL ON FUNCTION public.approve_manual_payment(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_manual_payment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_manual_payment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_manual_payment(uuid, text) TO authenticated;

-- ── Settings: payment mode + manual payment details ──────────
INSERT INTO public.app_settings (key, value, description) VALUES
  ('payment_mode', 'both', 'Payment mode: automatic | manual | both'),
  ('whatsapp_group_link', 'https://chat.whatsapp.com/HREug1CcIlOAP2sIkZ8sLL', 'Official WhatsApp approval group invite link'),
  ('manual_payment_name', 'ZedVevo Ltd', 'Account / wallet holder name for manual payments'),
  ('manual_payment_number', '0977000000', 'Mobile money / bank number for manual payments'),
  ('manual_payment_provider', 'MTN Mobile Money', 'Provider for manual payments'),
  ('manual_payment_instructions',
   'Send the exact amount to the number above, then submit your payment details and proof here and share them in the official WhatsApp approval group for verification.',
   'Instructions shown on the manual payment screen')
ON CONFLICT (key) DO NOTHING;

-- ======================
-- REALTIME
-- Lets users see approval / rejection instantly in their dashboard.
-- ======================
ALTER TABLE public.manual_payments REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'manual_payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.manual_payments;
  END IF;
END $$;
