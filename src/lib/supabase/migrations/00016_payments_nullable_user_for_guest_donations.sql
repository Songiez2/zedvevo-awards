-- Allow guest donations: user_id becomes nullable (no profile required)
ALTER TABLE public.payments
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN user_id SET DEFAULT NULL;

-- Add 'donation' as a valid payment_type if it's not already allowed
-- (the column is plain text so no enum change needed, just update the comment)
COMMENT ON COLUMN public.payments.payment_type IS 'plan | donation | nominee_registration | vote';

-- Allow service_role to insert payments for guests (no auth.uid())
-- The edge function uses service role key so it bypasses RLS already,
-- but add an explicit policy for clarity and future-proofing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payments' AND policyname = 'Service role insert payments'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Service role insert payments" ON public.payments
        FOR INSERT TO service_role WITH CHECK (true)
    $pol$;
  END IF;
END $$;