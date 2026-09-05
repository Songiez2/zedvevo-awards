
-- RLS: artists can insert/update/delete their own songs
CREATE POLICY "Artists manage own songs"
  ON songs FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('artist', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('artist', 'admin', 'super_admin')
    )
  );

-- RLS: artists can insert/update/delete their own videos
CREATE POLICY "Artists manage own videos"
  ON videos FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('artist', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('artist', 'admin', 'super_admin')
    )
  );

-- artists table: artists can manage their own record
CREATE POLICY "Artists manage own artist profile"
  ON artists FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('artist', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('artist', 'admin', 'super_admin')
    )
  );

-- Ensure avatars bucket exists (for profile pictures)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880;

-- Storage RLS for avatars (only add if not exists to avoid duplicates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Avatar upload own folder'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Avatar upload own folder"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Avatar update own'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Avatar update own"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Avatar delete own'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Avatar delete own"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Avatar public read'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Avatar public read"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'avatars')
    $pol$;
  END IF;
END;
$$;
