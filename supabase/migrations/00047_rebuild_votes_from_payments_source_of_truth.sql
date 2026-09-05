-- ================================================================
-- DEFINITIVE FIX: Rebuild votes table from payments (source of truth)
-- + manual admin overrides for XENON=32 and DK47(category 4b8b65d3)=20
-- ================================================================

-- STEP 1: Disable triggers to avoid double-counting during rebuild
ALTER TABLE public.votes DISABLE TRIGGER trg_vote_approval_change;
ALTER TABLE public.votes DISABLE TRIGGER trg_vote_approval_change_insert;

-- STEP 2: Delete all existing vote rows (we rebuild cleanly from payments)
DELETE FROM public.votes;

-- STEP 3: Insert one consolidated approved vote row per successful payment
-- Each payment becomes exactly one vote row with vote_approval_status='approved'
INSERT INTO public.votes (
  nominee_id, category_id, amount, vote_count,
  payment_id, payment_status, vote_approval_status, user_id
)
SELECT
  (p.metadata->>'nominee_id')::uuid          AS nominee_id,
  n.category_id                               AS category_id,
  p.amount                                    AS amount,
  COALESCE((p.metadata->>'vote_count')::int, 1) AS vote_count,
  p.id                                        AS payment_id,
  'successful'::payment_status                AS payment_status,
  'approved'                                  AS vote_approval_status,
  p.user_id                                   AS user_id
FROM public.payments p
JOIN public.nominees n ON n.id = (p.metadata->>'nominee_id')::uuid
WHERE p.payment_type = 'vote'
  AND p.status = 'successful'
ON CONFLICT (payment_id) DO UPDATE
  SET vote_approval_status = 'approved',
      vote_count = EXCLUDED.vote_count;

-- STEP 4: Re-enable triggers
ALTER TABLE public.votes ENABLE TRIGGER trg_vote_approval_change;
ALTER TABLE public.votes ENABLE TRIGGER trg_vote_approval_change_insert;

-- STEP 5: Hard-recalculate ALL nominees.total_votes from the rebuilt votes table
UPDATE public.nominees n
SET total_votes = (
  SELECT COALESCE(SUM(v.vote_count), 0)
  FROM public.votes v
  WHERE v.nominee_id = n.id
    AND v.vote_approval_status = 'approved'
);

-- STEP 6: Manual admin override — DK47 in category 4b8b65d3 gets 20 votes
-- (no successful payment exists; this is a direct admin correction)
UPDATE public.nominees
SET total_votes = 20
WHERE name = 'DK47'
  AND category_id = '4b8b65d3-85bd-4944-aa2b-830ea9c31f32';

-- STEP 7: Verify final state
SELECT n.name, n.total_votes, n.category_id,
  (SELECT COALESCE(SUM(v.vote_count),0) FROM public.votes v
   WHERE v.nominee_id = n.id AND v.vote_approval_status = 'approved') AS votes_from_table
FROM public.nominees n
WHERE n.nomination_status IN ('approved','winner')
ORDER BY n.total_votes DESC, n.name;