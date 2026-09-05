-- ============================================================
-- Complete rebuild of votes RLS + trigger logic
-- ============================================================

-- 1. Drop ALL existing votes policies to start clean
DROP POLICY IF EXISTS "Users view own votes"      ON public.votes;
DROP POLICY IF EXISTS "Users insert own votes"    ON public.votes;
DROP POLICY IF EXISTS "Admin manage votes"         ON public.votes;
DROP POLICY IF EXISTS "Anon view vote counts"      ON public.votes;
DROP POLICY IF EXISTS "service_role_all_votes"    ON public.votes;
DROP POLICY IF EXISTS "admin_all_votes"            ON public.votes;
DROP POLICY IF EXISTS "auth_view_own_votes"        ON public.votes;
DROP POLICY IF EXISTS "anon_insert_votes"          ON public.votes;

-- Make sure RLS is enabled
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- 2. Service role: unrestricted (edge functions + triggers use this)
CREATE POLICY "svc_all_votes" ON public.votes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Admin / super_admin: read and manage everything
CREATE POLICY "admin_all_votes" ON public.votes
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin','super_admin'))
  WITH CHECK (get_user_role(auth.uid()) IN ('admin','super_admin'));

-- 4. Authenticated users: insert their own votes (user_id = their uid OR null for guest-style)
CREATE POLICY "auth_insert_votes" ON public.votes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- 5. Authenticated users: view their own votes
CREATE POLICY "auth_view_own_votes" ON public.votes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR get_user_role(auth.uid()) IN ('admin','super_admin'));

-- 6. Anon: insert guest votes (no user_id)
CREATE POLICY "anon_insert_votes" ON public.votes
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);

-- 7. Anon: view approved vote counts (for public leaderboards)
CREATE POLICY "anon_view_approved_votes" ON public.votes
  FOR SELECT TO anon USING (vote_approval_status = 'approved');

-- ============================================================
-- Rebuild the vote approval trigger — clean, no race condition
-- ============================================================

-- The trigger fires AFTER UPDATE OF vote_approval_status.
-- It increments/decrements nominees.total_votes accordingly.
-- The DB payment trigger inserts the vote as 'pending'.
-- The webhook immediately calls UPDATE to set it to 'approved'
-- which fires THIS trigger and counts the votes.

CREATE OR REPLACE FUNCTION public.handle_vote_approval_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Transitioning TO approved → add votes
  IF NEW.vote_approval_status = 'approved' AND (OLD.vote_approval_status IS DISTINCT FROM 'approved') THEN
    UPDATE public.nominees
      SET total_votes = GREATEST(0, COALESCE(total_votes, 0) + NEW.vote_count)
    WHERE id = NEW.nominee_id;

  -- Transitioning FROM approved (to rejected/pending) → remove votes
  ELSIF OLD.vote_approval_status = 'approved' AND NEW.vote_approval_status <> 'approved' THEN
    UPDATE public.nominees
      SET total_votes = GREATEST(0, COALESCE(total_votes, 0) - NEW.vote_count)
    WHERE id = NEW.nominee_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vote_approval_change ON public.votes;
CREATE TRIGGER trg_vote_approval_change
  AFTER UPDATE OF vote_approval_status ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_vote_approval_change();

-- ============================================================
-- Payment success trigger: insert vote as PENDING only.
-- Webhook does the approval step (sets vote_approval_status='approved')
-- which fires trg_vote_approval_change → counts votes atomically.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_vote_payment_success()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nominee_id  uuid;
  v_category_id uuid;
  v_vote_count  int;
  v_tx_id       text;
  v_voter_id    uuid;
BEGIN
  -- Only fires for vote payments transitioning to successful
  IF NEW.payment_type <> 'vote'      THEN RETURN NEW; END IF;
  IF NEW.status <> 'successful'      THEN RETURN NEW; END IF;
  IF OLD.status = 'successful'       THEN RETURN NEW; END IF;

  v_nominee_id  := (NEW.metadata->>'nominee_id')::uuid;
  v_vote_count  := COALESCE((NEW.metadata->>'vote_count')::int, 1);
  v_tx_id       := COALESCE(NEW.lipila_transaction_id, NEW.id::text);
  v_voter_id    := NEW.user_id; -- NULL for guests

  IF v_nominee_id IS NULL OR v_vote_count <= 0 THEN RETURN NEW; END IF;

  SELECT category_id INTO v_category_id FROM public.nominees WHERE id = v_nominee_id;

  -- Idempotency: skip if vote_record already exists
  BEGIN
    INSERT INTO public.vote_records (payment_id, nominee_id, vote_count, lipila_tx_id)
    VALUES (NEW.id, v_nominee_id, v_vote_count, v_tx_id);
  EXCEPTION WHEN unique_violation THEN
    RETURN NEW; -- already processed
  END;

  -- Insert vote as pending; webhook will approve it → triggers count
  INSERT INTO public.votes
    (user_id, nominee_id, category_id, amount, vote_count, payment_id, payment_status, vote_approval_status)
  VALUES
    (v_voter_id, v_nominee_id, v_category_id, NEW.amount, v_vote_count, NEW.id, 'successful', 'pending')
  ON CONFLICT (payment_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vote_payment_success        ON public.payments;
DROP TRIGGER IF EXISTS trg_vote_payment_success_insert ON public.payments;

CREATE TRIGGER trg_vote_payment_success
  AFTER UPDATE ON public.payments FOR EACH ROW
  EXECUTE FUNCTION public.handle_vote_payment_success();

CREATE TRIGGER trg_vote_payment_success_insert
  AFTER INSERT ON public.payments FOR EACH ROW
  EXECUTE FUNCTION public.handle_vote_payment_success();

-- ============================================================
-- Ensure unique constraint on votes.payment_id
-- ============================================================
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_payment_id_unique;
ALTER TABLE public.votes ADD CONSTRAINT votes_payment_id_unique UNIQUE (payment_id);

-- ============================================================
-- Realtime publications
-- ============================================================
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.nominees; EXCEPTION WHEN duplicate_object THEN NULL; END $$;