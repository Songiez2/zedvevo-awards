
-- 1. Delete all user data (profiles cascade deletes subscriptions, payments, notifications)
DELETE FROM public.profiles;

-- 2. Seed ZedStream Music Awards 2025
INSERT INTO public.awards (id, name, description, is_active, voting_open)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'ZedStream Music Awards 2025',
  'Celebrating the best of Zambian music and entertainment.',
  true, true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  voting_open = EXCLUDED.voting_open;

-- 3. Remove old categories for this award then re-insert
DELETE FROM public.award_categories
  WHERE award_id = '00000000-0000-0000-0000-000000000001';

INSERT INTO public.award_categories (award_id, name, grand_prize, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Best Female Artist',              'K5,000 Cash + Trophy', true),
  ('00000000-0000-0000-0000-000000000001', 'Best Male Artist',                'K5,000 Cash + Trophy', true),
  ('00000000-0000-0000-0000-000000000001', 'Best New Artist',                 'K3,000 Cash + Trophy', true),
  ('00000000-0000-0000-0000-000000000001', 'Song of the Year',                'K5,000 Cash + Trophy', true),
  ('00000000-0000-0000-0000-000000000001', 'Album of the Year',               'K5,000 Cash + Trophy', true),
  ('00000000-0000-0000-0000-000000000001', 'Best Music Video',                'K3,000 Cash + Trophy', true),
  ('00000000-0000-0000-0000-000000000001', 'Best Collaboration',              'K3,000 Cash + Trophy', true),
  ('00000000-0000-0000-0000-000000000001', 'Best Hip-Hop / Rap Artist',       'K3,000 Cash + Trophy', true),
  ('00000000-0000-0000-0000-000000000001', 'Best Gospel Artist',              'K3,000 Cash + Trophy', true),
  ('00000000-0000-0000-0000-000000000001', 'Best R&B / Soul Artist',          'K3,000 Cash + Trophy', true),
  ('00000000-0000-0000-0000-000000000001', 'Best Afrobeats Artist',           'K3,000 Cash + Trophy', true),
  ('00000000-0000-0000-0000-000000000001', 'Best Dancehall Artist',           'K3,000 Cash + Trophy', true),
  ('00000000-0000-0000-0000-000000000001', 'Fan Favourite Artist',            'K2,000 Cash + Trophy', true),
  ('00000000-0000-0000-0000-000000000001', 'Best Producer',                   'K3,000 Cash + Trophy', true),
  ('00000000-0000-0000-0000-000000000001', 'Breakthrough Artist of the Year', 'K2,000 Cash + Trophy', true);
