
-- Re-insert the super_admin profile (was wiped in the clear-users migration)
-- The auth.users row still exists — we just need the profiles row back
INSERT INTO public.profiles (id, email, username, display_name, role)
SELECT
  au.id,
  au.email,
  'superadmin',
  'Super Admin',
  'super_admin'::public.user_role
FROM auth.users au
WHERE au.email = 'topkuchalo@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role         = 'super_admin'::public.user_role,
  display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
  username     = COALESCE(EXCLUDED.username, profiles.username);
