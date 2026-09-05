
-- Support tickets (replaces/extends help_messages with priority + assignment)
CREATE TABLE IF NOT EXISTS support_tickets (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  name          text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  email         text        NOT NULL CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  subject       text        NOT NULL CHECK (char_length(subject) BETWEEN 2 AND 200),
  message       text        NOT NULL CHECK (char_length(message) >= 10),
  priority      text        NOT NULL DEFAULT 'normal'
                            CHECK (priority IN ('low','normal','high','urgent')),
  status        text        NOT NULL DEFAULT 'open'
                            CHECK (status IN ('open','in_progress','waiting','resolved','closed')),
  category      text        DEFAULT 'general'
                            CHECK (category IN ('general','billing','technical','content','awards','other')),
  assigned_to   uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  admin_notes   text,
  resolved_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Anyone (anon for guests, authenticated for logged-in) can submit
CREATE POLICY "tickets_insert_anon"
  ON support_tickets FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated users can view their own tickets
CREATE POLICY "tickets_select_own"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','super_admin')
    )
  );

-- Admins can update (assign, change status, add notes)
CREATE POLICY "tickets_update_admin"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','super_admin')
    )
  );

-- Admins can delete
CREATE POLICY "tickets_delete_admin"
  ON support_tickets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','super_admin')
    )
  );

CREATE INDEX tickets_user_id_idx   ON support_tickets (user_id);
CREATE INDEX tickets_status_idx    ON support_tickets (status);
CREATE INDEX tickets_priority_idx  ON support_tickets (priority);
CREATE INDEX tickets_created_at_idx ON support_tickets (created_at DESC);
