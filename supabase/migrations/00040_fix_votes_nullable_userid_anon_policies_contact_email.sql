-- 1. Make votes.user_id nullable so guests can vote
ALTER TABLE public.votes ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add contact_email to nominees for guest registrants
ALTER TABLE public.nominees ADD COLUMN IF NOT EXISTS contact_email text;

-- 3. Fix anon payments policy to also allow nominee_registration
DROP POLICY IF EXISTS "anon_insert_vote_payments" ON public.payments;
CREATE POLICY "anon_insert_guest_payments" ON public.payments
  FOR INSERT TO anon
  WITH CHECK (
    user_id IS NULL
    AND payment_type IN ('vote', 'nominee_registration')
  );

-- 4. Allow anon to read their own pending payments (for polling)
DROP POLICY IF EXISTS "anon_select_payments" ON public.payments;
CREATE POLICY "anon_select_payments" ON public.payments
  FOR SELECT TO anon USING (true);

-- 5. Allow anon to insert into votes (guest votes)
DROP POLICY IF EXISTS "anon_insert_votes" ON public.votes;
CREATE POLICY "anon_insert_votes" ON public.votes
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

-- 6. Allow service_role full access to votes
DROP POLICY IF EXISTS "service_role_all_votes" ON public.votes;
CREATE POLICY "service_role_all_votes" ON public.votes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 7. Allow admin to manage all votes
DROP POLICY IF EXISTS "admin_all_votes" ON public.votes;
CREATE POLICY "admin_all_votes" ON public.votes
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin','super_admin'))
  WITH CHECK (get_user_role(auth.uid()) IN ('admin','super_admin'));

-- 8. Allow authenticated users to view their own votes
DROP POLICY IF EXISTS "auth_view_own_votes" ON public.votes;
CREATE POLICY "auth_view_own_votes" ON public.votes
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR get_user_role(auth.uid()) IN ('admin','super_admin'));

-- 9. Update vote trigger to also insert into votes table
CREATE OR REPLACE FUNCTION public.handle_vote_payment_success()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_nominee_id  uuid;
  v_category_id uuid;
  v_vote_count  int;
  v_tx_id       text;
  v_voter_id    uuid;
BEGIN
  IF NEW.payment_type <> 'vote' THEN RETURN NEW; END IF;
  IF NEW.status <> 'successful' THEN RETURN NEW; END IF;
  IF OLD.status = 'successful' THEN RETURN NEW; END IF;

  v_nominee_id  := (NEW.metadata->>'nominee_id')::uuid;
  v_vote_count  := COALESCE((NEW.metadata->>'vote_count')::int, 1);
  v_tx_id       := COALESCE(NEW.lipila_transaction_id, NEW.id::text);
  v_voter_id    := NEW.user_id; -- NULL for guests, that's fine

  -- Resolve category from nominee
  SELECT category_id INTO v_category_id FROM public.nominees WHERE id = v_nominee_id;

  IF v_nominee_id IS NULL OR v_vote_count <= 0 THEN RETURN NEW; END IF;

  -- Idempotency guard: insert vote_record (UNIQUE on payment_id)
  BEGIN
    INSERT INTO public.vote_records (payment_id, nominee_id, vote_count, lipila_tx_id)
    VALUES (NEW.id, v_nominee_id, v_vote_count, v_tx_id);
  EXCEPTION WHEN unique_violation THEN
    RETURN NEW; -- already processed
  END;

  -- Increment nominees.total_votes atomically
  UPDATE public.nominees
    SET total_votes = COALESCE(total_votes, 0) + v_vote_count
    WHERE id = v_nominee_id;

  -- Insert into votes table so admin can see the vote
  INSERT INTO public.votes (user_id, nominee_id, category_id, amount, vote_count, payment_id, payment_status)
  VALUES (
    v_voter_id,
    v_nominee_id,
    v_category_id,
    NEW.amount,
    v_vote_count,
    NEW.id,
    'successful'
  );

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

-- 10. Realtime for votes
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.nominees;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;