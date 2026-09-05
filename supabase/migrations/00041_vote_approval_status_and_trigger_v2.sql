-- 1. Add vote_approval_status to votes table
ALTER TABLE public.votes
  ADD COLUMN IF NOT EXISTS vote_approval_status text NOT NULL DEFAULT 'pending'
  CHECK (vote_approval_status IN ('pending','approved','rejected'));

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_votes_approval_status ON public.votes(vote_approval_status);

-- 2. Helper RPC: increment or decrement nominee total_votes
CREATE OR REPLACE FUNCTION public.increment_nominee_votes(nom_id uuid, delta int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.nominees
    SET total_votes = GREATEST(0, COALESCE(total_votes, 0) + delta)
  WHERE id = nom_id;
END;
$$;

-- 3. Trigger: fires when votes.vote_approval_status changes to 'approved' or 'rejected'
--    - approved  → increment nominees.total_votes by vote_count
--    - rejected  → if previously approved, decrement nominees.total_votes
CREATE OR REPLACE FUNCTION public.handle_vote_approval_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Approved: count the votes
  IF NEW.vote_approval_status = 'approved' AND OLD.vote_approval_status <> 'approved' THEN
    UPDATE public.nominees
      SET total_votes = GREATEST(0, COALESCE(total_votes, 0) + NEW.vote_count)
    WHERE id = NEW.nominee_id;

  -- Rejected after being approved: undo the count
  ELSIF NEW.vote_approval_status = 'rejected' AND OLD.vote_approval_status = 'approved' THEN
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

-- 4. Rework payments trigger: insert vote as PENDING (not approved)
--    votes.total_votes is NOT touched here — only the approval trigger does that
CREATE OR REPLACE FUNCTION public.handle_vote_payment_success()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  v_voter_id    := NEW.user_id;

  SELECT category_id INTO v_category_id FROM public.nominees WHERE id = v_nominee_id;

  IF v_nominee_id IS NULL OR v_vote_count <= 0 THEN RETURN NEW; END IF;

  -- Idempotency via vote_records
  BEGIN
    INSERT INTO public.vote_records (payment_id, nominee_id, vote_count, lipila_tx_id)
    VALUES (NEW.id, v_nominee_id, v_vote_count, v_tx_id);
  EXCEPTION WHEN unique_violation THEN
    RETURN NEW;
  END;

  -- Insert vote as PENDING — webhook will approve it (Lipila auto-approve)
  -- Admin can also manually approve from the votes tab
  INSERT INTO public.votes (user_id, nominee_id, category_id, amount, vote_count, payment_id, payment_status, vote_approval_status)
  VALUES (v_voter_id, v_nominee_id, v_category_id, NEW.amount, v_vote_count, NEW.id, 'successful', 'pending')
  ON CONFLICT (payment_id) DO NOTHING;

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

-- 5. Unique constraint on votes.payment_id to support ON CONFLICT
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_payment_id_unique;
ALTER TABLE public.votes ADD CONSTRAINT votes_payment_id_unique UNIQUE (payment_id);

-- 6. Realtime
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.votes; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.nominees; EXCEPTION WHEN duplicate_object THEN NULL; END $$;