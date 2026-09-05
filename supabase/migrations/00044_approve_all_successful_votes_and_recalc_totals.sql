-- ============================================================
-- STEP 1: Approve ALL votes where payment was successful
-- (These were stuck as 'pending' because webhook never fired)
-- Disable the trigger temporarily to avoid double-counting,
-- then recalculate from scratch.
-- ============================================================

-- Disable the approval trigger temporarily
ALTER TABLE public.votes DISABLE TRIGGER trg_vote_approval_change;
ALTER TABLE public.votes DISABLE TRIGGER trg_vote_approval_change_insert;

-- Approve all votes with successful payments
UPDATE public.votes
SET vote_approval_status = 'approved'
WHERE payment_status = 'successful'
  AND vote_approval_status <> 'approved';

-- Re-enable triggers
ALTER TABLE public.votes ENABLE TRIGGER trg_vote_approval_change;
ALTER TABLE public.votes ENABLE TRIGGER trg_vote_approval_change_insert;

-- STEP 2: Hard-recalculate total_votes for EVERY nominee from scratch
-- This is the definitive source of truth
UPDATE public.nominees n
SET total_votes = (
  SELECT COALESCE(SUM(v.vote_count), 0)
  FROM public.votes v
  WHERE v.nominee_id = n.id
    AND v.vote_approval_status = 'approved'
);

-- STEP 3: Fix the payment trigger — insert directly as 'approved'
-- so votes are counted immediately without needing the webhook.
-- The webhook can still upsert for idempotency, but won't be the gatekeeper.
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
  v_voter_id    := NEW.user_id;

  IF v_nominee_id IS NULL OR v_vote_count <= 0 THEN RETURN NEW; END IF;

  SELECT category_id INTO v_category_id FROM public.nominees WHERE id = v_nominee_id;

  -- Idempotency: skip if vote_record already exists
  BEGIN
    INSERT INTO public.vote_records (payment_id, nominee_id, vote_count, lipila_tx_id)
    VALUES (NEW.id, v_nominee_id, v_vote_count, v_tx_id);
  EXCEPTION WHEN unique_violation THEN
    RETURN NEW;
  END;

  -- Insert vote as APPROVED directly — trg_vote_approval_change_insert fires
  -- and immediately increments nominees.total_votes.
  -- ON CONFLICT: if row somehow exists, update to approved so trigger fires.
  INSERT INTO public.votes
    (user_id, nominee_id, category_id, amount, vote_count, payment_id, payment_status, vote_approval_status)
  VALUES
    (v_voter_id, v_nominee_id, v_category_id, NEW.amount, v_vote_count, NEW.id, 'successful', 'approved')
  ON CONFLICT (payment_id) DO UPDATE
    SET vote_approval_status = 'approved',
        payment_status = 'successful';

  RETURN NEW;
END;
$$;

-- Verify the fix
SELECT
  n.id,
  n.name,
  n.total_votes,
  (SELECT COALESCE(SUM(v.vote_count),0) FROM public.votes v WHERE v.nominee_id = n.id AND v.vote_approval_status = 'approved') AS computed_votes
FROM public.nominees n
WHERE n.nomination_status IN ('approved','winner')
ORDER BY n.total_votes DESC;