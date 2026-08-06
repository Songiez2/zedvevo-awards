
-- ─── UPLOAD PLANS ────────────────────────────────────────────────────────────
INSERT INTO upload_plans (name, description, price, plan_type, uploads_allowed, validity_days, is_active)
VALUES
  ('K10 Single Upload',       'Upload 1 song or video',              10,  'k10_single',    1,    NULL, true),
  ('K100 Weekly Unlimited',   'Unlimited uploads for 7 days',        100, 'k100_weekly',   NULL, 7,    true),
  ('K300 Yearly Unlimited',   'Unlimited uploads for 1 year',        300, 'k300_yearly',   NULL, 365,  true)
ON CONFLICT DO NOTHING;

-- ─── APP SETTINGS ────────────────────────────────────────────────────────────
INSERT INTO app_settings (key, value, description) VALUES
  ('nominee_fee',          '25',  'Nominee registration fee (ZMW)'),
  ('vote_min_amount',      '5',   'Minimum vote amount (ZMW)'),
  ('platform_name',        'ZedStream', 'Platform name'),
  ('maintenance_mode',     'false', 'Enable/disable maintenance mode')
ON CONFLICT (key) DO NOTHING;

-- ─── SAMPLE AWARD ────────────────────────────────────────────────────────────
INSERT INTO awards (name, description, year, voting_open, is_active)
VALUES ('ZedStream Music Awards 2026', 'Celebrating the best in Zambian music and entertainment', 2026, true, true)
ON CONFLICT DO NOTHING;
