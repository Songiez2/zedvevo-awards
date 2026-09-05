
-- Daily visits analytics view for admin dashboard
CREATE OR REPLACE VIEW visits_analytics AS
SELECT
  date_trunc('day', visited_at AT TIME ZONE 'UTC')::date AS day,
  COUNT(*)                                                AS total_visits,
  COUNT(DISTINCT session_id)                              AS unique_sessions,
  page,
  COUNT(*) FILTER (WHERE referrer IS NOT NULL AND referrer <> '') AS visits_with_referrer
FROM visitor_logs
GROUP BY date_trunc('day', visited_at AT TIME ZONE 'UTC')::date, page
ORDER BY day DESC, total_visits DESC;

-- Materialized daily totals for fast dashboard queries
CREATE TABLE IF NOT EXISTS daily_visit_totals (
  day            date        PRIMARY KEY,
  total_visits   int         NOT NULL DEFAULT 0,
  unique_sessions int        NOT NULL DEFAULT 0,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE daily_visit_totals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_visit_totals_select_admin"
  ON daily_visit_totals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','super_admin')
    )
  );

-- Function to refresh today's totals (called by log-visit edge function)
CREATE OR REPLACE FUNCTION refresh_daily_visit_totals(target_day date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO daily_visit_totals (day, total_visits, unique_sessions, updated_at)
  SELECT
    target_day,
    COUNT(*),
    COUNT(DISTINCT session_id),
    now()
  FROM visitor_logs
  WHERE visited_at::date = target_day
  ON CONFLICT (day) DO UPDATE
    SET total_visits    = EXCLUDED.total_visits,
        unique_sessions = EXCLUDED.unique_sessions,
        updated_at      = now();
END;
$$;
