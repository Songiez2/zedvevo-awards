-- ==========================================
-- 00017_nominee_auto_approval_realtime.sql
-- Auto approve nominees after successful payment
-- ==========================================

CREATE OR REPLACE FUNCTION public.auto_approve_nominee_after_payment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only run when payment becomes successful
  IF NEW.status = 'successful'
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.payment_type = 'nominee_registration'
  THEN

    UPDATE public.nominees
    SET
      registration_status = 'successful',
      payment_id = NEW.id
    WHERE payment_id = NEW.id
       OR (
            user_id = NEW.user_id
            AND registration_status = 'pending'
          );

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_approve_nominee_after_payment
ON public.payments;

CREATE TRIGGER trg_auto_approve_nominee_after_payment
AFTER UPDATE OF status
ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.auto_approve_nominee_after_payment();

COMMENT ON FUNCTION public.auto_approve_nominee_after_payment()
IS 'Automatically approves nominee registrations after successful payment.';