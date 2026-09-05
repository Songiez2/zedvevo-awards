
-- Drop and recreate all payment policies cleanly
DROP POLICY IF EXISTS "Service role insert payments" ON public.payments;
DROP POLICY IF EXISTS "Users insert own payments" ON public.payments;
DROP POLICY IF EXISTS "Auth users insert own payments" ON public.payments;
DROP POLICY IF EXISTS "Anon insert vote payments" ON public.payments;
DROP POLICY IF EXISTS "Anon insert payments" ON public.payments;
DROP POLICY IF EXISTS "Guest insert vote payments" ON public.payments;
DROP POLICY IF EXISTS "Service role update payments" ON public.payments;
DROP POLICY IF EXISTS "Anon view own pending payments" ON public.payments;
DROP POLICY IF EXISTS "Anon view payment by idempotency" ON public.payments;
DROP POLICY IF EXISTS "Users view own payments" ON public.payments;
DROP POLICY IF EXISTS "Auth users view own payments" ON public.payments;
DROP POLICY IF EXISTS "Admin full access payments" ON public.payments;

-- Service role: full access (edge functions use service key)
CREATE POLICY "service_role_all_payments" ON public.payments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users: insert and view own payments
CREATE POLICY "auth_insert_own_payments" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "auth_view_own_payments" ON public.payments
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Anonymous: insert vote payments (guest voting, user_id must be NULL)
CREATE POLICY "anon_insert_vote_payments" ON public.payments
  FOR INSERT TO anon WITH CHECK (payment_type = 'vote' AND user_id IS NULL);

-- Anonymous: select payments by idempotency_key for status polling
CREATE POLICY "anon_select_payments" ON public.payments
  FOR SELECT TO anon USING (true);

-- Admin full access
CREATE POLICY "admin_all_payments" ON public.payments
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin','super_admin'))
  WITH CHECK (get_user_role(auth.uid()) IN ('admin','super_admin'));

-- 2. Unique constraint on lipila_transaction_id
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_lipila_transaction_id_unique;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_lipila_transaction_id_unique UNIQUE (lipila_transaction_id);

-- 3. vote_records table for idempotency
CREATE TABLE IF NOT EXISTS public.vote_records (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id   uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  nominee_id   uuid NOT NULL REFERENCES public.nominees(id) ON DELETE CASCADE,
  vote_count   int  NOT NULL DEFAULT 1,
  lipila_tx_id text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payment_id)
);
ALTER TABLE public.vote_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_vote_records" ON public.vote_records
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "public_read_vote_records" ON public.vote_records
  FOR SELECT TO anon, authenticated USING (true);

-- 4. Idempotent vote trigger
CREATE OR REPLACE FUNCTION public.handle_vote_payment_success()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_nominee_id uuid;
  v_vote_count int;
  v_tx_id      text;
BEGIN
  IF NEW.payment_type <> 'vote' THEN RETURN NEW; END IF;
  IF NEW.status <> 'successful' THEN RETURN NEW; END IF;
  IF OLD.status = 'successful' THEN RETURN NEW; END IF;

  v_nominee_id := (NEW.metadata->>'nominee_id')::uuid;
  v_vote_count := COALESCE((NEW.metadata->>'vote_count')::int, 1);
  v_tx_id      := COALESCE(NEW.lipila_transaction_id, NEW.id::text);

  IF v_nominee_id IS NULL OR v_vote_count <= 0 THEN RETURN NEW; END IF;

  BEGIN
    INSERT INTO public.vote_records (payment_id, nominee_id, vote_count, lipila_tx_id)
    VALUES (NEW.id, v_nominee_id, v_vote_count, v_tx_id);
  EXCEPTION WHEN unique_violation THEN
    RETURN NEW; -- already processed
  END;

  UPDATE public.nominees
    SET total_votes = COALESCE(total_votes, 0) + v_vote_count
    WHERE id = v_nominee_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vote_payment_success ON public.payments;
DROP TRIGGER IF EXISTS trg_vote_payment_success_insert ON public.payments;
CREATE TRIGGER trg_vote_payment_success
  AFTER UPDATE ON public.payments FOR EACH ROW
  EXECUTE FUNCTION public.handle_vote_payment_success();
CREATE TRIGGER trg_vote_payment_success_insert
  AFTER INSERT ON public.payments FOR EACH ROW
  EXECUTE FUNCTION public.handle_vote_payment_success();

-- 5. nominees.total_votes NOT NULL
UPDATE public.nominees SET total_votes = 0 WHERE total_votes IS NULL;
ALTER TABLE public.nominees ALTER COLUMN total_votes SET DEFAULT 0;
ALTER TABLE public.nominees ALTER COLUMN total_votes SET NOT NULL;

-- 6. Realtime publication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.nominees;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
