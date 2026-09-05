
-- Help messages table for support requests
CREATE TABLE IF NOT EXISTS help_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name        text NOT NULL DEFAULT 'Anonymous',
  email       text NOT NULL DEFAULT 'unknown',
  subject     text NOT NULL DEFAULT 'Help Request',
  message     text NOT NULL,
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  admin_reply text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_help_messages_status ON help_messages(status);
CREATE INDEX IF NOT EXISTS idx_help_messages_created ON help_messages(created_at DESC);

-- RLS
ALTER TABLE help_messages ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "admins_all_help_messages" ON help_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

-- Authenticated users can insert their own messages
CREATE POLICY "users_insert_help_messages" ON help_messages
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can view their own messages
CREATE POLICY "users_view_own_help_messages" ON help_messages
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Anon can insert (for guests) via service role only — blocked for direct anon
-- (help-message edge function uses service role key to insert)
