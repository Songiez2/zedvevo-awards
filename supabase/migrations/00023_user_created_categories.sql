
-- User-created / custom award categories
-- Allows authenticated users to propose categories; admins approve them
CREATE TABLE IF NOT EXISTS user_created_categories (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  award_id      uuid        REFERENCES awards(id) ON DELETE SET NULL,
  name          text        NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  description   text,
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','approved','rejected')),
  admin_notes   text,
  reviewed_by   uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_created_categories ENABLE ROW LEVEL SECURITY;

-- Users can create categories
CREATE POLICY "ucc_insert_auth"
  ON user_created_categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own; admins see all
CREATE POLICY "ucc_select"
  ON user_created_categories FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','super_admin')
    )
  );

-- Only admins can update (review/approve/reject)
CREATE POLICY "ucc_update_admin"
  ON user_created_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','super_admin')
    )
  );

-- Admins can delete
CREATE POLICY "ucc_delete_admin"
  ON user_created_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','super_admin')
    )
  );

CREATE INDEX ucc_user_id_idx   ON user_created_categories (user_id);
CREATE INDEX ucc_award_id_idx  ON user_created_categories (award_id);
CREATE INDEX ucc_status_idx    ON user_created_categories (status);
