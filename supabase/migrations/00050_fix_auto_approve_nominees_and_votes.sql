-- ================================================================
-- Fix auto-approval for nominees and votes on successful payment
-- Root causes identified:
--   1. nominees has no UNIQUE on payment_id → ON CONFLICT (payment_id) fails
--   2. nominees UNIQUE(user_id, category_id) blocks multiple guest nominees
--   3. Nomination trigger uses ON CONFLICT(payment_id) which doesn't exist
-- ================================================================

-- Step 1: Add UNIQUE index on nominees.payment_id (partial: only where not null)
-- This allows ON CONFLICT (payment_id) to work in the trigger
CREATE UNIQUE INDEX IF NOT EXISTS nominees_payment_id_unique
  ON public.nominees (payment_id)
  WHERE payment_id IS NOT NULL;

-- Step 2: Drop the UNIQUE(user_id, category_id) constraint that blocks
-- multiple nominees from same user in different registrations, and guest
-- registrations (where user_id IS NULL they'd all conflict as null != null
-- in unique indexes — actually nulls don't conflict in postgres unique indexes,
-- but let's verify the constraint is safe to keep by checking if it blocks us)
-- Actually in PostgreSQL, UNIQUE constraints treat NULL as distinct, so
-- multiple NULL user_ids are fine. The real problem is ON CONFLICT(payment_id)
-- failing because there's no unique index on payment_id. Step 1 fixes that.

-- Step 3: Rebuild handle_nominee_registration_payment cleanly
-- Uses payment_id to find existing row (via the new unique index)
CREATE OR REPLACE FUNCTION public.handle_nominee_registration_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_meta       jsonb;
  v_user_id    uuid;
  v_nominee_id uuid;
  v_category_id uuid;
BEGIN
  -- Only fires for nominee_registration payments
  IF NEW.payment_type <> 'nominee_registration' THEN RETURN NEW; END IF;
  -- Only act on transition to successful
  IF NEW.status <> 'successful'  THEN RETURN NEW; END IF;
  IF OLD.status = 'successful'   THEN RETURN NEW; END IF;

  v_meta        := NEW.metadata;
  v_user_id     := NEW.user_id;

  -- Must have at minimum a name and category
  IF v_meta->>'category_id' IS NULL OR v_meta->>'nominee_name' IS NULL THEN
    RAISE LOG '[nominee_reg] missing category_id or nominee_name in payment %', NEW.id;
    RETURN NEW;
  END IF;

  v_category_id := (v_meta->>'category_id')::uuid;

  -- Upsert nominee using payment_id as the conflict target
  -- (requires the nominees_payment_id_unique partial index above)
  INSERT INTO public.nominees (
    name, category_id, payment_id, user_id,
    registration_status, nomination_status, total_votes,
    bio, photo_url, song_title, song_url,
    achievements, social_links
  ) VALUES (
    v_meta->>'nominee_name',
    v_category_id,
    NEW.id,               -- payment_id
    v_user_id,            -- null for guests
    'successful',
    'approved',           -- ← live immediately, no admin review
    0,
    NULLIF(v_meta->>'bio', ''),
    NULLIF(v_meta->>'photo_url', ''),
    NULLIF(v_meta->>'song_title', ''),
    NULLIF(v_meta->>'song_url', ''),
    NULLIF(v_meta->>'achievements', ''),
    NULLIF(v_meta->>'social_links', '')
  )
  ON CONFLICT (payment_id) DO UPDATE
    SET registration_status = 'successful',
        nomination_status   = 'approved'
  WHERE nominees.nomination_status <> 'approved';  -- idempotent

  RAISE LOG '[nominee_reg] upserted nominee for payment %, category %', NEW.id, v_category_id;
  RETURN NEW;
END;
$$;

-- Step 4: Rebuild handle_vote_payment_success cleanly
-- Works for both UPDATE (status change) and INSERT (direct insert as successful)
CREATE OR REPLACE FUNCTION public.handle_vote_payment_success()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nominee_id  uuid;
  v_category_id uuid;
  v_vote_count  int;
  v_tx_id       text;
  v_voter_id    uuid;
  v_old_status  text;
BEGIN
  -- Only fires for vote payments
  IF NEW.payment_type <> 'vote' THEN RETURN NEW; END IF;

  v_nominee_id := (NEW.metadata->>'nominee_id')::uuid;
  v_vote_count := COALESCE((NEW.metadata->>'vote_count')::int, 1);
  v_tx_id      := COALESCE(NEW.lipila_transaction_id, NEW.id::text);
  v_voter_id   := NEW.user_id;

  IF v_nominee_id IS NULL OR v_vote_count <= 0 THEN RETURN NEW; END IF;

  SELECT category_id INTO v_category_id FROM public.nominees WHERE id = v_nominee_id;

  -- For INSERT, OLD is null — treat old status as empty
  v_old_status := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE '' END;

  -- ── SUCCESSFUL: approve vote immediately, no admin needed ───────────────
  IF NEW.status = 'successful' AND v_old_status <> 'successful' THEN

    -- Idempotency guard via vote_records (has UNIQUE on payment_id)
    BEGIN
      INSERT INTO public.vote_records (payment_id, nominee_id, vote_count, lipila_tx_id)
      VALUES (NEW.id, v_nominee_id, v_vote_count, v_tx_id);
    EXCEPTION WHEN unique_violation THEN
      -- Already recorded — ensure vote row is approved (in case it got stuck as pending)
      UPDATE public.votes
        SET vote_approval_status = 'approved',
            payment_status       = 'successful'
      WHERE payment_id = NEW.id
        AND vote_approval_status <> 'approved';
      RETURN NEW;
    END;

    -- Insert vote as APPROVED — handle_vote_approval_change fires on INSERT
    -- and immediately increments nominees.total_votes. Zero delay, no admin.
    INSERT INTO public.votes
      (user_id, nominee_id, category_id, amount, vote_count,
       payment_id, payment_status, vote_approval_status)
    VALUES
      (v_voter_id, v_nominee_id, v_category_id, NEW.amount, v_vote_count,
       NEW.id, 'successful', 'approved')
    ON CONFLICT (payment_id) DO UPDATE
      SET vote_approval_status = 'approved',
          payment_status       = 'successful',
          vote_count           = EXCLUDED.vote_count
      WHERE votes.vote_approval_status <> 'approved';

    RAISE LOG '[vote] approved % votes for nominee % payment %', v_vote_count, v_nominee_id, NEW.id;

  -- ── FAILED / CANCELLED / WRONG PIN: reject immediately ──────────────────
  ELSIF NEW.status IN ('failed', 'cancelled', 'insufficient_funds', 'invalid_transaction')
    AND v_old_status NOT IN ('failed','cancelled','insufficient_funds','invalid_transaction','successful')
  THEN
    INSERT INTO public.votes
      (user_id, nominee_id, category_id, amount, vote_count,
       payment_id, payment_status, vote_approval_status)
    VALUES
      (v_voter_id, v_nominee_id, v_category_id, NEW.amount, v_vote_count,
       NEW.id, NEW.status, 'rejected')
    ON CONFLICT (payment_id) DO UPDATE
      SET vote_approval_status = 'rejected',
          payment_status       = EXCLUDED.payment_status
      WHERE votes.vote_approval_status <> 'approved';  -- never downgrade approved vote

  END IF;

  RETURN NEW;
END;
$$;

-- Step 5: Ensure all triggers are in place on payments table
DROP TRIGGER IF EXISTS trg_vote_payment_success        ON public.payments;
DROP TRIGGER IF EXISTS trg_vote_payment_success_insert ON public.payments;
DROP TRIGGER IF EXISTS trg_nominee_registration_payment ON public.payments;

CREATE TRIGGER trg_vote_payment_success
  AFTER UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_vote_payment_success();

CREATE TRIGGER trg_vote_payment_success_insert
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_vote_payment_success();

CREATE TRIGGER trg_nominee_registration_payment
  AFTER UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_nominee_registration_payment();

-- Step 6: Retroactively approve any nominees that have a successful payment
-- but are still stuck as pending_review
UPDATE public.nominees n
SET nomination_status = 'approved',
    registration_status = 'successful'
FROM public.payments p
WHERE n.payment_id = p.id
  AND p.payment_type = 'nominee_registration'
  AND p.status = 'successful'
  AND n.nomination_status IN ('pending_review', 'pending_payment');

-- Step 7: Retroactively approve any votes stuck as pending with successful payment
UPDATE public.votes v
SET vote_approval_status = 'approved'
FROM public.payments p
WHERE v.payment_id = p.id
  AND p.payment_type = 'vote'
  AND p.status = 'successful'
  AND v.vote_approval_status = 'pending';

-- Step 8: Recalculate all nominee vote totals from approved votes
UPDATE public.nominees n
SET total_votes = (
  SELECT COALESCE(SUM(v.vote_count), 0)
  FROM public.votes v
  WHERE v.nominee_id = n.id
    AND v.vote_approval_status = 'approved'
);

-- Verify final state
SELECT 
  (SELECT COUNT(*) FROM public.nominees WHERE nomination_status = 'pending_review') AS nominees_pending,
  (SELECT COUNT(*) FROM public.nominees WHERE nomination_status = 'approved') AS nominees_approved,
  (SELECT COUNT(*) FROM public.votes WHERE vote_approval_status = 'pending') AS votes_pending,
  (SELECT COUNT(*) FROM public.votes WHERE vote_approval_status = 'approved') AS votes_approved;