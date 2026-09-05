-- ================================================================
-- Fix: Ensure votes and nominees have proper UNIQUE CONSTRAINTS
-- (not just indexes) so PostgREST ON CONFLICT upsert works.
-- ================================================================

-- ── votes.payment_id ─────────────────────────────────────────────────────────
ALTER TABLE public.votes 
  DROP CONSTRAINT IF EXISTS votes_payment_id_unique;

ALTER TABLE public.votes
  ADD CONSTRAINT votes_payment_id_unique UNIQUE (payment_id);

-- ── nominees.payment_id ──────────────────────────────────────────────────────
ALTER TABLE public.nominees
  DROP CONSTRAINT IF EXISTS nominees_payment_id_unique;

DROP INDEX IF EXISTS public.nominees_payment_id_unique;

ALTER TABLE public.nominees
  ADD CONSTRAINT nominees_payment_id_unique UNIQUE (payment_id);

-- ── Realtime: add nominees and votes if not already present ──────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.nominees;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Verify constraints ────────────────────────────────────────────────────────
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid IN ('public.votes'::regclass, 'public.nominees'::regclass)
  AND contype = 'u'
ORDER BY conrelid::text, conname;