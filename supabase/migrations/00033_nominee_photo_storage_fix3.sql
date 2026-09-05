
-- Drop dependent policies first, then recreate function + policies
DROP POLICY IF EXISTS "Users insert own songs" ON public.songs;
DROP POLICY IF EXISTS "Users insert own videos" ON public.videos;
DROP FUNCTION IF EXISTS public.has_upload_entitlement(uuid) CASCADE;

-- Recreate entitlement function
CREATE FUNCTION public.has_upload_entitlement(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_subscriptions
    WHERE user_id = p_user_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND (
        plan_type IN ('k100_weekly', 'k300_yearly')
        OR (plan_type = 'k10_single' AND uploads_used < 1)
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id
      AND role IN ('admin', 'super_admin')
  );
$$;

-- Recreate songs INSERT policy (owns row + has entitlement)
CREATE POLICY "Users insert own songs"
  ON public.songs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.has_upload_entitlement(auth.uid()));

-- Recreate videos INSERT policy
CREATE POLICY "Users insert own videos"
  ON public.videos FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.has_upload_entitlement(auth.uid()));

-- nominees storage: ensure UPDATE policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Auth update nominees'
  ) THEN
    EXECUTE $p$ CREATE POLICY "Auth update nominees" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'nominees') WITH CHECK (bucket_id = 'nominees'); $p$;
  END IF;
END $$;

-- Storage INSERT policies for songs/videos/thumbnails (only create if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Authenticated upload songs'
  ) THEN
    EXECUTE $p$ CREATE POLICY "Authenticated upload songs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'songs'); $p$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Authenticated upload videos'
  ) THEN
    EXECUTE $p$ CREATE POLICY "Authenticated upload videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'videos'); $p$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Authenticated upload thumbnails'
  ) THEN
    EXECUTE $p$ CREATE POLICY "Authenticated upload thumbnails" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'thumbnails'); $p$;
  END IF;
END $$;
