
-- Fix process_pending_payment: use 'successful' not 'completed' (DB enum only has 'successful')
CREATE OR REPLACE FUNCTION public.process_pending_payment(p_payment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment       RECORD;
  v_plan          RECORD;
  v_now           timestamptz := now();
  v_expires_at    timestamptz;
  v_sub_id        uuid;
BEGIN
  SELECT p.id, p.user_id, p.status, p.payment_type, p.plan_id
    INTO v_payment
    FROM payments p
   WHERE p.id = p_payment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Payment not found');
  END IF;

  IF v_payment.status = 'successful' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Payment already completed');
  END IF;

  -- Mark payment successful (correct enum value)
  UPDATE payments
     SET status     = 'successful',
         updated_at = v_now
   WHERE id = p_payment_id;

  -- Plan payments → promote to artist + activate subscription
  IF v_payment.payment_type = 'plan' AND v_payment.plan_id IS NOT NULL THEN
    SELECT up.plan_type, up.uploads_allowed, up.validity_days
      INTO v_plan
      FROM upload_plans up
     WHERE up.id = v_payment.plan_id;

    IF FOUND THEN
      -- Promote role from 'user' only — never demote admins
      UPDATE profiles
         SET role       = 'artist',
             updated_at = v_now
       WHERE id   = v_payment.user_id
         AND role = 'user';

      -- Compute expiry
      IF v_plan.validity_days IS NOT NULL THEN
        v_expires_at := v_now + (v_plan.validity_days || ' days')::interval;
      ELSE
        v_expires_at := NULL;
      END IF;

      -- Deactivate old subscriptions
      UPDATE user_subscriptions
         SET is_active = false
       WHERE user_id  = v_payment.user_id
         AND is_active = true;

      -- Create new subscription
      INSERT INTO user_subscriptions
        (user_id, plan_id, plan_type, uploads_allowed, uploads_used,
         is_active, activated_at, expires_at)
      VALUES
        (v_payment.user_id, v_payment.plan_id, v_plan.plan_type,
         v_plan.uploads_allowed, 0,
         true, v_now, v_expires_at)
      RETURNING id INTO v_sub_id;

      UPDATE payments SET subscription_id = v_sub_id WHERE id = p_payment_id;

      INSERT INTO notifications (user_id, title, message, type, notification_type, link)
      VALUES (
        v_payment.user_id,
        '🎵 Artist Account Active!',
        'Your artist account is now active. Start uploading your music and videos!',
        'success', 'artist_activated', '/upload'
      );
    END IF;
  END IF;

  -- Nominee registration → approve nominee
  IF v_payment.payment_type = 'nominee_registration' THEN
    UPDATE nominees
       SET registration_status = 'successful',
           nomination_status   = 'approved'
     WHERE payment_id = p_payment_id;

    IF v_payment.user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, notification_type, link)
      VALUES (
        v_payment.user_id,
        '🎉 Nomination Approved!',
        'Your nomination payment was confirmed. Your nominee is now live on the Awards page.',
        'success', 'nomination_approved', '/awards'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'payment_id', p_payment_id,
    'new_status', 'successful'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_pending_payment(uuid) TO authenticated;
