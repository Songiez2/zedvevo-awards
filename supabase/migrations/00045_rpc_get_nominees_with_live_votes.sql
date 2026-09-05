-- RPC: nominees for a category with live approved-vote sum from votes table
CREATE OR REPLACE FUNCTION public.get_nominees_with_live_votes(p_category_id uuid)
RETURNS TABLE (
  id                  uuid,
  name                text,
  bio                 text,
  photo_url           text,
  song_title          text,
  song_url            text,
  achievements        text,
  social_links        text,
  total_votes         bigint,
  is_winner           boolean,
  nomination_status   text,
  registration_status payment_status,
  category_id         uuid,
  user_id             uuid,
  created_at          timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    n.id,
    n.name,
    n.bio,
    n.photo_url,
    n.song_title,
    n.song_url,
    n.achievements,
    n.social_links,
    COALESCE(SUM(v.vote_count), 0)::bigint AS total_votes,
    n.is_winner,
    n.nomination_status,
    n.registration_status,
    n.category_id,
    n.user_id,
    n.created_at
  FROM public.nominees n
  LEFT JOIN public.votes v
    ON v.nominee_id = n.id
    AND v.vote_approval_status = 'approved'
  WHERE n.category_id = p_category_id
    AND n.registration_status = 'successful'
    AND n.nomination_status IN ('approved', 'winner')
  GROUP BY
    n.id, n.name, n.bio, n.photo_url, n.song_title, n.song_url,
    n.achievements, n.social_links, n.is_winner, n.nomination_status,
    n.registration_status, n.category_id, n.user_id, n.created_at
  ORDER BY total_votes DESC, n.created_at DESC;
$$;

-- Utility: bulk recalculate all nominees total_votes from votes table
CREATE OR REPLACE FUNCTION public.recalc_all_nominees_votes()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.nominees n
  SET total_votes = (
    SELECT COALESCE(SUM(v.vote_count), 0)
    FROM public.votes v
    WHERE v.nominee_id = n.id
      AND v.vote_approval_status = 'approved'
  );
END;
$$;