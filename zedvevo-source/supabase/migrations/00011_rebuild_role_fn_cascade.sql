
-- Drop with cascade (policies rebuilt below), then recreate
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;

CREATE FUNCTION public.get_user_role(uid uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN role::text = 'super_admin' THEN 'admin' ELSE role::text END
  FROM public.profiles WHERE id = uid;
$$;

-- Seed super_admin
INSERT INTO public.profiles (id, email, username, display_name, role)
SELECT au.id, au.email,
  COALESCE((SELECT username     FROM public.profiles WHERE id = au.id), 'superadmin'),
  COALESCE((SELECT display_name FROM public.profiles WHERE id = au.id), 'Super Admin'),
  'super_admin'::public.user_role
FROM auth.users au WHERE au.email = 'topkuchalo@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'super_admin'::public.user_role;

-- Recreate every policy that used get_user_role
CREATE POLICY "Admin full access profiles"       ON profiles           FOR ALL  TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Users update own profile"         ON profiles           FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Super admin manage roles"         ON profiles           FOR UPDATE TO authenticated USING ((SELECT role::text FROM public.profiles WHERE id = auth.uid()) = 'super_admin');
CREATE POLICY "Admin full access songs"          ON songs              FOR ALL  TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin full access videos"         ON videos             FOR ALL  TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin full access payments"       ON payments           FOR ALL  TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Service role update payments"     ON payments           FOR UPDATE TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin manage plans"               ON upload_plans       FOR ALL  TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin full access subscriptions"  ON user_subscriptions FOR ALL  TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin full access likes"          ON content_likes      FOR ALL  TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin view library"               ON user_library       FOR SELECT TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin manage awards"              ON awards             FOR ALL  TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin manage award categories"    ON award_categories   FOR ALL  TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin manage nominees"            ON nominees           FOR ALL  TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin manage votes"               ON votes              FOR ALL  TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin manage sponsors"            ON sponsors           FOR ALL  TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin manage banners"             ON hero_banners       FOR ALL  TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin manage notifications"       ON notifications      FOR ALL  TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin manage settings"            ON app_settings       FOR ALL  TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin manage artists"             ON artists            FOR ALL  TO authenticated USING (get_user_role(auth.uid()) = 'admin');
