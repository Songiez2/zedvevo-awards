-- Allow webhook (service role) to insert nominees even when user_id
-- might not be in profiles yet, and fix RLS to allow service_role bypass.

-- 1. Make user_id nullable so webhook insert never fails on missing profile
ALTER TABLE public.nominees ALTER COLUMN user_id DROP NOT NULL;

-- 2. Widen public visibility: show nominees with registration_status = 'successful'
--    (already the case) AND pending_review so admin can see them too via service role
-- Service role bypasses RLS automatically — no policy change needed for webhook.

-- 3. Update RLS so authenticated users can also see their own pending nominees
DROP POLICY IF EXISTS "Auth view nominees" ON nominees;
CREATE POLICY "Auth view nominees" ON nominees
  FOR SELECT TO authenticated
  USING (
    registration_status = 'successful'
    OR user_id = auth.uid()
  );

-- 4. Add payment_type column to payments if missing (safety)
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_type TEXT;

-- 5. Ensure nomination_status has pending_review value allowed
ALTER TABLE public.nominees DROP CONSTRAINT IF EXISTS nominees_nomination_status_check;
ALTER TABLE public.nominees ADD CONSTRAINT nominees_nomination_status_check
  CHECK (nomination_status IN ('pending_payment','pending_review','approved','rejected','winner'));