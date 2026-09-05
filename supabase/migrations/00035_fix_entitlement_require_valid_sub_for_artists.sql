
-- Fix has_upload_entitlement:
-- Artists MUST have a valid non-expired active subscription to upload.
-- Admins/super_admins bypass all checks.
-- This is now consistent with the frontend canUpload logic.
DROP POLICY IF EXISTS "Users insert own songs"  ON public.songs;
DROP POLICY IF EXISTS "Users insert own videos" ON public.videos;
DROP FUNCTION IF EXISTS public.has_upload_entitlement(uuid) CASCADE;

CREATE FUNCTION public.has_upload_entitlement(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Admins always allowed
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id
      AND role IN ('admin', 'super_admin')
  )
  -- Artists AND regular users: must have a valid active subscription
  OR EXISTS (
    SELECT 1 FROM public.user_subscriptions us
    JOIN public.profiles pr ON pr.id = us.user_id
    WHERE us.user_id = p_user_id
      AND us.is_active = true
      AND (us.expires_at IS NULL OR us.expires_at > now())
      AND (
        us.plan_type IN ('k100_weekly', 'k300_yearly')
        OR (us.plan_type = 'k10_single' AND us.uploads_used < 1)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_upload_entitlement(uuid) TO authenticated;

-- Recreate RLS policies for songs and videos INSERT
CREATE POLICY "Users insert own songs"
  ON public.songs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.has_upload_entitlement(auth.uid()));

CREATE POLICY "Users insert own videos"
  ON public.videos FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.has_upload_entitlement(auth.uid()));
