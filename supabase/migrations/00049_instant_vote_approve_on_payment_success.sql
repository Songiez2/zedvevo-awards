-- ================================================================
-- Ensure votes are ALWAYS approved instantly when payment succeeds.
-- The trigger already does this — this migration makes it bulletproof:
--   1. Rebuild trigger to handle all edge cases (cancelled, wrong pin, etc.)
--   2. Add a payment status → vote rejection path for cancelled/wrong-pin
--   3. Ensure the trg_vote_approval_change_insert trigger still fires
-- ================================================================

-- Step 1: Rebuild the vote payment success trigger
-- Votes are ALWAYS inserted as 'approved' immediately when payment is successful.
-- No admin approval needed. No pending state.
CREATE OR REPLACE FUNCTION public.handle_vote_payment_success()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nominee_id  uuid;
  v_category_id uuid;
  v_vote_count  int;
  v_tx_id       text;
  v_voter_id    uuid;
BEGIN
  -- Only fires for vote payments
  IF NEW.payment_type <> 'vote' THEN RETURN NEW; END IF;

  v_nominee_id := (NEW.metadata->>'nominee_id')::uuid;
  v_vote_count := COALESCE((NEW.metadata->>'vote_count')::int, 1);
  v_tx_id      := COALESCE(NEW.lipila_transaction_id, NEW.id::text);
  v_voter_id   := NEW.user_id;

  IF v_nominee_id IS NULL OR v_vote_count <= 0 THEN RETURN NEW; END IF;

  SELECT category_id INTO v_category_id FROM public.nominees WHERE id = v_nominee_id;

  -- ── SUCCESSFUL: approve vote immediately ─────────────────────────────────
  IF NEW.status = 'successful' AND OLD.status <> 'successful' THEN
    -- Idempotency: record this payment so we never double-count
    BEGIN
      INSERT INTO public.vote_records (payment_id, nominee_id, vote_count, lipila_tx_id)
      VALUES (NEW.id, v_nominee_id, v_vote_count, v_tx_id);
    EXCEPTION WHEN unique_violation THEN
      -- Already recorded — just make sure vote row is approved
      UPDATE public.votes
        SET vote_approval_status = 'approved', payment_status = 'successful'
        WHERE payment_id = NEW.id
          AND vote_approval_status <> 'approved';
      RETURN NEW;
    END;

    -- Upsert vote as APPROVED — trg_vote_approval_change_insert fires and
    -- immediately increments nominees.total_votes. No admin step needed.
    INSERT INTO public.votes
      (user_id, nominee_id, category_id, amount, vote_count,
       payment_id, payment_status, vote_approval_status)
    VALUES
      (v_voter_id, v_nominee_id, v_category_id, NEW.amount, v_vote_count,
       NEW.id, 'successful', 'approved')
    ON CONFLICT (payment_id) DO UPDATE
      SET vote_approval_status = 'approved',
          payment_status       = 'successful',
          vote_count           = EXCLUDED.vote_count;

  -- ── CANCELLED / WRONG PIN / FAILED: reject vote immediately ─────────────
  ELSIF NEW.status IN ('failed', 'cancelled', 'insufficient_funds', 'invalid_transaction')
        AND OLD.status NOT IN ('failed', 'cancelled', 'insufficient_funds', 'invalid_transaction', 'successful')
  THEN
    -- Upsert a rejected vote row so the record exists (for audit), no count change
    INSERT INTO public.votes
      (user_id, nominee_id, category_id, amount, vote_count,
       payment_id, payment_status, vote_approval_status)
    VALUES
      (v_voter_id, v_nominee_id, v_category_id, NEW.amount, v_vote_count,
       NEW.id, NEW.status, 'rejected')
    ON CONFLICT (payment_id) DO UPDATE
      SET vote_approval_status = 'rejected',
          payment_status       = EXCLUDED.payment_status
      WHERE votes.vote_approval_status <> 'approved'; -- never downgrade an already-approved vote
  END IF;

  RETURN NEW;
END;
$$;

-- Step 2: Rebuild nominee registration trigger to auto-approve immediately
CREATE OR REPLACE FUNCTION public.handle_nominee_registration_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_meta       jsonb;
  v_user_id    uuid;
  v_nominee_id uuid;
BEGIN
  IF NEW.payment_type <> 'nominee_registration' THEN RETURN NEW; END IF;
  IF NEW.status <> 'successful'                  THEN RETURN NEW; END IF;
  IF OLD.status = 'successful'                   THEN RETURN NEW; END IF;

  v_meta    := NEW.metadata;
  v_user_id := NEW.user_id;

  IF v_meta->>'category_id' IS NULL OR v_meta->>'nominee_name' IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if nominee already exists for this payment
  SELECT id INTO v_nominee_id FROM public.nominees WHERE payment_id = NEW.id;

  IF v_nominee_id IS NOT NULL THEN
    -- Already exists — ensure approved
    UPDATE public.nominees
    SET registration_status = 'successful',
        nomination_status   = 'approved'
    WHERE id = v_nominee_id;
  ELSE
    -- Insert as approved immediately — no admin review needed
    INSERT INTO public.nominees (
      name, category_id, payment_id, user_id,
      registration_status, nomination_status, total_votes,
      bio, photo_url, song_title, song_url,
      achievements, social_links
    ) VALUES (
      v_meta->>'nominee_name',
      (v_meta->>'category_id')::uuid,
      NEW.id,
      v_user_id,
      'successful',
      'approved',    -- ← immediately live on awards page
      0,
      v_meta->>'bio',
      v_meta->>'photo_url',
      v_meta->>'song_title',
      v_meta->>'song_url',
      v_meta->>'achievements',
      v_meta->>'social_links'
    )
    ON CONFLICT (payment_id) DO UPDATE
      SET registration_status = 'successful',
          nomination_status   = 'approved';
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure the nominee_registration trigger exists and fires on UPDATE
DROP TRIGGER IF EXISTS trg_nominee_registration_payment ON public.payments;
CREATE TRIGGER trg_nominee_registration_payment
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_nominee_registration_payment();

-- Verify triggers exist
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'payments'
ORDER BY trigger_name;