-- Ensure anon can see all successful nominees (including total_votes column)
-- The existing "Anyone view nominees" policy is correct but let's make sure
-- it explicitly covers the total_votes column by verifying RLS is enabled
-- and the policy has no column restrictions.

-- Re-create the anon SELECT policy with explicit permissive access
DROP POLICY IF EXISTS "Anyone view nominees" ON public.nominees;
CREATE POLICY "Anyone view nominees"
  ON public.nominees FOR SELECT
  TO anon
  USING (registration_status = 'successful');

-- Re-create auth SELECT policy
DROP POLICY IF EXISTS "Auth view nominees" ON public.nominees;
CREATE POLICY "Auth view nominees"
  ON public.nominees FOR SELECT
  TO authenticated
  USING (registration_status = 'successful' OR user_id = auth.uid());

-- Fix anon votes view policy — use plain text comparison (column is text type)
DROP POLICY IF EXISTS "anon_view_approved_votes" ON public.votes;
CREATE POLICY "anon_view_approved_votes"
  ON public.votes FOR SELECT
  TO anon
  USING (vote_approval_status = 'approved');

-- Auth users: see their own votes OR all approved votes (for vote counts)
DROP POLICY IF EXISTS "auth_view_own_votes" ON public.votes;
CREATE POLICY "auth_view_own_votes"
  ON public.votes FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR vote_approval_status = 'approved'
    OR get_user_role(auth.uid()) = ANY(ARRAY['admin', 'super_admin'])
  );

-- Grant explicit SELECT on nominees and votes to anon + authenticated
GRANT SELECT ON public.nominees TO anon, authenticated;
GRANT SELECT ON public.votes   TO anon, authenticated;

-- Verify: show current vote counts visible to public
SELECT n.name, n.total_votes,
  (SELECT COUNT(*) FROM public.votes v WHERE v.nominee_id = n.id AND v.vote_approval_status = 'approved') as approved_vote_rows
FROM public.nominees n
WHERE n.nomination_status IN ('approved','winner')
  AND n.registration_status = 'successful'
ORDER BY n.total_votes DESC;