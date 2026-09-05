
-- Artists with role='artist' ALWAYS have upload entitlement — subscription tracks quota only.
-- Also admin/super_admin always have access.
CREATE OR REPLACE FUNCTION public.has_upload_entitlement(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Admins and artists always have access
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id
      AND role IN ('admin', 'super_admin', 'artist')
  )
  -- Regular users need a valid active subscription
  OR EXISTS (
    SELECT 1 FROM public.user_subscriptions
    WHERE user_id = p_user_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND (
        plan_type IN ('k100_weekly', 'k300_yearly')
        OR (plan_type = 'k10_single' AND uploads_used < 1)
      )
  );
$$;

-- Backfill: give artists with NO active subscription a k100_weekly (7-day) plan
-- so they have quota tracking and a subscription row (avoids UI showing "no plan")
DO $$
DECLARE
  default_plan_id uuid;
  artist_rec RECORD;
BEGIN
  -- Get the k100_weekly plan id
  SELECT id INTO default_plan_id
  FROM public.upload_plans
  WHERE plan_type = 'k100_weekly' AND is_active = true
  LIMIT 1;

  -- Fallback to any active plan if k100_weekly not found
  IF default_plan_id IS NULL THEN
    SELECT id INTO default_plan_id
    FROM public.upload_plans
    WHERE is_active = true
    ORDER BY price ASC
    LIMIT 1;
  END IF;

  IF default_plan_id IS NULL THEN
    RAISE NOTICE 'No active plan found — skipping backfill';
    RETURN;
  END IF;

  -- For each artist with no active subscription, create one
  FOR artist_rec IN
    SELECT p.id
    FROM public.profiles p
    WHERE p.role = 'artist'
      AND NOT EXISTS (
        SELECT 1 FROM public.user_subscriptions us
        WHERE us.user_id = p.id AND us.is_active = true
      )
  LOOP
    INSERT INTO public.user_subscriptions (
      user_id, plan_id, plan_type, is_active, uploads_used, expires_at
    )
    SELECT
      artist_rec.id,
      up.id,
      up.plan_type,
      true,
      0,
      now() + interval '365 days'  -- generous default for existing artists
    FROM public.upload_plans up
    WHERE up.id = default_plan_id;

    RAISE NOTICE 'Backfilled subscription for artist %', artist_rec.id;
  END LOOP;
END $$;
