
-- Server-side upload entitlement enforcement
-- This function returns TRUE only when the calling user has a valid upload entitlement.
-- It is SECURITY DEFINER so it runs with elevated privileges and can be used in RLS.
CREATE OR REPLACE FUNCTION public.has_upload_entitlement(uid uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_sub  record;
BEGIN
  -- Admins and super_admins always allowed
  SELECT role::text INTO v_role FROM public.profiles WHERE id = uid;
  IF v_role IN ('admin', 'super_admin') THEN RETURN true; END IF;

  -- Must be artist role to have ever paid
  IF v_role <> 'artist' THEN RETURN false; END IF;

  -- Must have an active, non-expired subscription
  SELECT * INTO v_sub
  FROM public.user_subscriptions
  WHERE user_id = uid
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY activated_at DESC
  LIMIT 1;

  IF NOT FOUND THEN RETURN false; END IF;

  -- K10: must have uploads remaining
  IF v_sub.plan_type = 'k10_single' THEN
    RETURN COALESCE(v_sub.uploads_used, 0) < COALESCE(v_sub.uploads_allowed, 1);
  END IF;

  -- K100 / K300: unlimited within expiry window (already checked above)
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_upload_entitlement(uuid) TO authenticated;

-- Drop old permissive insert policies for songs and videos, replace with entitlement-gated ones
-- Songs
DROP POLICY IF EXISTS "Users insert own songs" ON songs;
CREATE POLICY "Users insert own songs"
  ON songs FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.has_upload_entitlement(auth.uid())
  );

-- Videos
DROP POLICY IF EXISTS "Users insert own videos" ON videos;
CREATE POLICY "Users insert own videos"
  ON videos FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.has_upload_entitlement(auth.uid())
  );

-- Also ensure user_subscriptions UPDATE is allowed by the owner (for uploads_used increment)
DROP POLICY IF EXISTS "Users update own subscriptions" ON user_subscriptions;
CREATE POLICY "Users update own subscriptions"
  ON user_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
