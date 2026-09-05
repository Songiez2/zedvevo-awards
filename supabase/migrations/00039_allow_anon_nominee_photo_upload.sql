-- Allow anonymous users to upload photos to nominees bucket
-- They get a random UUID-based path so there's no collision
CREATE POLICY "Anon upload nominees"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'nominees');