
-- Function: fires when a payments row transitions to status='successful'
-- If payment_type='vote', atomically increments nominees.total_votes
CREATE OR REPLACE FUNCTION public.handle_vote_payment_success()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nominee_id  uuid;
  v_vote_count  int;
BEGIN
  -- Only act when status changes TO 'successful' for vote payments
  IF NEW.payment_type = 'vote'
     AND NEW.status = 'successful'
     AND (OLD.status IS DISTINCT FROM 'successful')
  THEN
    v_nominee_id := (NEW.metadata->>'nominee_id')::uuid;
    v_vote_count := COALESCE((NEW.metadata->>'vote_count')::int, 1);

    IF v_nominee_id IS NOT NULL AND v_vote_count > 0 THEN
      UPDATE public.nominees
      SET total_votes = COALESCE(total_votes, 0) + v_vote_count
      WHERE id = v_nominee_id;

      RAISE NOTICE '[vote_trigger] nominee % += % votes', v_nominee_id, v_vote_count;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create fresh
DROP TRIGGER IF EXISTS trg_vote_payment_success ON public.payments;

CREATE TRIGGER trg_vote_payment_success
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_vote_payment_success();

-- Also fire on INSERT (in case payment is created already-successful)
DROP TRIGGER IF EXISTS trg_vote_payment_success_insert ON public.payments;

CREATE TRIGGER trg_vote_payment_success_insert
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_vote_payment_success();
