-- Fix handle_vote_payment_success: v_old_status is text but compared against
-- payment_status enum values in IN(...) lists, causing implicit enum cast of ''
-- which throws "invalid input value for enum payment_status: """
-- on EVERY payments INSERT (TG_OP='INSERT' sets v_old_status='').
-- Fix: change v_old_status to text and use NEW.status::text for all comparisons.

CREATE OR REPLACE FUNCTION public.handle_vote_payment_success()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_nominee_id  uuid;
  v_category_id uuid;
  v_vote_count  int;
  v_tx_id       text;
  v_voter_id    uuid;
  v_old_status  text;
  v_new_status  text;
BEGIN
  -- Only fires for vote payments
  IF NEW.payment_type <> 'vote' THEN RETURN NEW; END IF;

  v_nominee_id := (NEW.metadata->>'nominee_id')::uuid;
  v_vote_count := COALESCE((NEW.metadata->>'vote_count')::int, 1);
  v_tx_id      := COALESCE(NEW.lipila_transaction_id, NEW.id::text);
  v_voter_id   := NEW.user_id;

  IF v_nominee_id IS NULL OR v_vote_count <= 0 THEN RETURN NEW; END IF;

  SELECT category_id INTO v_category_id FROM public.nominees WHERE id = v_nominee_id;

  -- Cast enum to text for all comparisons — avoids implicit enum cast of '' crashing on INSERT
  v_new_status := NEW.status::text;
  v_old_status := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status::text ELSE '' END;

  -- ── SUCCESSFUL: approve vote immediately ─────────────────────────────
  IF v_new_status = 'successful' AND v_old_status <> 'successful' THEN

    -- Idempotency guard via vote_records (has UNIQUE on payment_id)
    BEGIN
      INSERT INTO public.vote_records (payment_id, nominee_id, vote_count, lipila_tx_id)
      VALUES (NEW.id, v_nominee_id, v_vote_count, v_tx_id);
    EXCEPTION WHEN unique_violation THEN
      UPDATE public.votes
        SET vote_approval_status = 'approved',
            payment_status       = 'successful'
      WHERE payment_id = NEW.id
        AND vote_approval_status <> 'approved';
      RETURN NEW;
    END;

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

  -- ── FAILED / CANCELLED / WRONG PIN: reject immediately ──────────────
  ELSIF v_new_status IN ('failed', 'cancelled', 'insufficient_funds', 'invalid_transaction')
    AND v_old_status NOT IN ('failed', 'cancelled', 'insufficient_funds', 'invalid_transaction', 'successful')
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
      WHERE votes.vote_approval_status <> 'approved';

  END IF;

  RETURN NEW;
END;
$$;