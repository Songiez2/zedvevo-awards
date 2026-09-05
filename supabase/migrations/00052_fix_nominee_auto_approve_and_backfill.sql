-- ================================================================
-- Fix: Nominee auto-approval on successful payment
-- Root cause: webhook not firing + UNIQUE(user_id,category_id) blocking
-- ================================================================

-- Step 1: Drop the UNIQUE(user_id, category_id) constraint.
-- This constraint wrongly prevents a user from nominating in a category
-- if they paid before. A person can legitimately pay multiple times
-- (retries, different nominees). The payment_id is the correct identity key.
ALTER TABLE public.nominees
  DROP CONSTRAINT IF EXISTS nominees_user_id_category_id_key;

-- Step 2: Rebuild handle_nominee_registration_payment (UPDATE + INSERT)
CREATE OR REPLACE FUNCTION public.handle_nominee_registration_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_meta        jsonb;
  v_user_id     uuid;
  v_category_id uuid;
  v_nom_id      uuid;
  v_old_status  text;
BEGIN
  IF NEW.payment_type <> 'nominee_registration' THEN RETURN NEW; END IF;
  IF NEW.status <> 'successful' THEN RETURN NEW; END IF;

  v_old_status := CASE WHEN TG_OP = 'UPDATE' THEN COALESCE(OLD.status, '') ELSE '' END;
  IF v_old_status = 'successful' THEN RETURN NEW; END IF;

  v_meta        := COALESCE(NEW.metadata, '{}'::jsonb);
  v_user_id     := NEW.user_id;
  v_category_id := (v_meta->>'category_id')::uuid;

  IF v_category_id IS NULL OR NULLIF(TRIM(COALESCE(v_meta->>'nominee_name','')), '') IS NULL THEN
    RAISE LOG '[nominee_reg] payment % missing fields, skip', NEW.id;
    RETURN NEW;
  END IF;

  SELECT id INTO v_nom_id FROM public.nominees WHERE payment_id = NEW.id;

  IF v_nom_id IS NOT NULL THEN
    UPDATE public.nominees
      SET registration_status = 'successful', nomination_status = 'approved'
    WHERE id = v_nom_id AND nomination_status NOT IN ('approved','winner');
    RAISE LOG '[nominee_reg] payment % nominee % ensured approved', NEW.id, v_nom_id;
  ELSE
    INSERT INTO public.nominees (
      name, category_id, payment_id, user_id,
      registration_status, nomination_status, total_votes,
      bio, photo_url, song_title, song_url, achievements, social_links
    ) VALUES (
      TRIM(v_meta->>'nominee_name'), v_category_id, NEW.id, v_user_id,
      'successful', 'approved', 0,
      NULLIF(TRIM(COALESCE(v_meta->>'bio','')), ''),
      NULLIF(TRIM(COALESCE(v_meta->>'photo_url','')), ''),
      NULLIF(TRIM(COALESCE(v_meta->>'song_title','')), ''),
      NULLIF(TRIM(COALESCE(v_meta->>'song_url','')), ''),
      NULLIF(TRIM(COALESCE(v_meta->>'achievements','')), ''),
      NULLIF(TRIM(COALESCE(v_meta->>'social_links','')), '')
    )
    ON CONFLICT ON CONSTRAINT nominees_payment_id_unique DO UPDATE
      SET registration_status = 'successful', nomination_status = 'approved'
      WHERE nominees.nomination_status NOT IN ('approved','winner');
    RAISE LOG '[nominee_reg] payment % nominee created', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Step 3: Ensure both UPDATE and INSERT triggers exist
DROP TRIGGER IF EXISTS trg_nominee_registration_payment        ON public.payments;
DROP TRIGGER IF EXISTS trg_nominee_registration_payment_insert ON public.payments;

CREATE TRIGGER trg_nominee_registration_payment
  AFTER UPDATE ON public.payments FOR EACH ROW
  EXECUTE FUNCTION public.handle_nominee_registration_payment();

CREATE TRIGGER trg_nominee_registration_payment_insert
  AFTER INSERT ON public.payments FOR EACH ROW
  EXECUTE FUNCTION public.handle_nominee_registration_payment();

-- Step 4: Retroactive backfill — create nominees for all successful payments
-- that somehow never got a nominee row (webhook never fired for them)
INSERT INTO public.nominees (
  name, category_id, payment_id, user_id,
  registration_status, nomination_status, total_votes,
  bio, photo_url, song_title, song_url, achievements, social_links
)
SELECT
  TRIM(p.metadata->>'nominee_name'),
  (p.metadata->>'category_id')::uuid,
  p.id,
  p.user_id,
  'successful', 'approved', 0,
  NULLIF(TRIM(COALESCE(p.metadata->>'bio','')), ''),
  NULLIF(TRIM(COALESCE(p.metadata->>'photo_url','')), ''),
  NULLIF(TRIM(COALESCE(p.metadata->>'song_title','')), ''),
  NULLIF(TRIM(COALESCE(p.metadata->>'song_url','')), ''),
  NULLIF(TRIM(COALESCE(p.metadata->>'achievements','')), ''),
  NULLIF(TRIM(COALESCE(p.metadata->>'social_links','')), '')
FROM public.payments p
WHERE p.payment_type = 'nominee_registration'
  AND p.status = 'successful'
  AND NULLIF(TRIM(COALESCE(p.metadata->>'nominee_name','')), '') IS NOT NULL
  AND (p.metadata->>'category_id')::uuid IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.nominees n WHERE n.payment_id = p.id)
ON CONFLICT ON CONSTRAINT nominees_payment_id_unique DO UPDATE
  SET registration_status = 'successful', nomination_status = 'approved';

-- Step 5: Ensure all nominees with successful payments are approved
UPDATE public.nominees n
SET registration_status = 'successful', nomination_status = 'approved'
FROM public.payments p
WHERE n.payment_id = p.id
  AND p.payment_type = 'nominee_registration'
  AND p.status = 'successful'
  AND n.nomination_status NOT IN ('approved','winner');

-- Verify
SELECT nomination_status, COUNT(*) FROM public.nominees
GROUP BY nomination_status ORDER BY nomination_status;