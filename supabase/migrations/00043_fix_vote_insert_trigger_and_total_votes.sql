-- The approval trigger currently only fires on UPDATE OF vote_approval_status.
-- When the webhook does upsert (INSERT) + update, the INSERT goes in first as 'pending'
-- then the UPDATE to 'approved' fires the trigger. This is correct in theory,
-- BUT if there's any issue, we add a safety: also fire on INSERT when already 'approved'.

CREATE OR REPLACE FUNCTION public.handle_vote_approval_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- If inserted directly as approved, count immediately
    IF NEW.vote_approval_status = 'approved' THEN
      UPDATE public.nominees
        SET total_votes = GREATEST(0, COALESCE(total_votes, 0) + NEW.vote_count)
      WHERE id = NEW.nominee_id;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE logic
  IF NEW.vote_approval_status = 'approved' AND (OLD.vote_approval_status IS DISTINCT FROM 'approved') THEN
    UPDATE public.nominees
      SET total_votes = GREATEST(0, COALESCE(total_votes, 0) + NEW.vote_count)
    WHERE id = NEW.nominee_id;
  ELSIF OLD.vote_approval_status = 'approved' AND NEW.vote_approval_status <> 'approved' THEN
    UPDATE public.nominees
      SET total_votes = GREATEST(0, COALESCE(total_votes, 0) - NEW.vote_count)
    WHERE id = NEW.nominee_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-create triggers: AFTER INSERT + AFTER UPDATE
DROP TRIGGER IF EXISTS trg_vote_approval_change        ON public.votes;
DROP TRIGGER IF EXISTS trg_vote_approval_change_insert ON public.votes;

CREATE TRIGGER trg_vote_approval_change
  AFTER UPDATE OF vote_approval_status ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_vote_approval_change();

CREATE TRIGGER trg_vote_approval_change_insert
  AFTER INSERT ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_vote_approval_change();

-- Safety: also expose an RPC to force-recalculate total_votes for a nominee
-- from the votes table (for admin repair tool)
CREATE OR REPLACE FUNCTION public.recalc_nominee_votes(nom_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total int;
BEGIN
  SELECT COALESCE(SUM(vote_count), 0)
    INTO v_total
  FROM public.votes
  WHERE nominee_id = nom_id
    AND vote_approval_status = 'approved';

  UPDATE public.nominees SET total_votes = v_total WHERE id = nom_id;
  RETURN v_total;
END;
$$;