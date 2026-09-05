
-- 1. Add nominees_open column to awards (controls whether new nominations are accepted)
ALTER TABLE awards ADD COLUMN nominees_open boolean NOT NULL DEFAULT false;

-- 2. visitor_logs table — records every page visit (anon-safe, no PII required)
CREATE TABLE visitor_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visited_at  timestamptz NOT NULL DEFAULT now(),
  page        text NOT NULL DEFAULT '/',
  session_id  text,           -- random client-side ID, no auth required
  user_agent  text,
  referrer    text
);

-- RLS
ALTER TABLE visitor_logs ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can insert their own visit
CREATE POLICY "visitor_logs_insert_anon"
  ON visitor_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read visitor logs
CREATE POLICY "visitor_logs_select_admin"
  ON visitor_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','super_admin')
    )
  );

-- Admins can delete old entries
CREATE POLICY "visitor_logs_delete_admin"
  ON visitor_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','super_admin')
    )
  );

-- index for fast daily queries
CREATE INDEX visitor_logs_visited_at_idx ON visitor_logs (visited_at DESC);
CREATE INDEX visitor_logs_page_idx ON visitor_logs (page);

-- 3. Make sure awards RLS allows admins to update the new column (already covered by existing policies)
-- Verify awards has RLS and admin update policy exists
-- (no change needed — existing admin UPDATE policy on awards covers all columns)
