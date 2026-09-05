-- Update recalc_all_nominees_votes to sync from payments when votes table diverges
CREATE OR REPLACE FUNCTION public.recalc_all_nominees_votes()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Rebuild any missing vote rows from successful payments
  INSERT INTO public.votes (
    nominee_id, category_id, amount, vote_count,
    payment_id, payment_status, vote_approval_status, user_id
  )
  SELECT
    (p.metadata->>'nominee_id')::uuid,
    n.category_id,
    p.amount,
    COALESCE((p.metadata->>'vote_count')::int, 1),
    p.id,
    'successful'::payment_status,
    'approved',
    p.user_id
  FROM public.payments p
  JOIN public.nominees n ON n.id = (p.metadata->>'nominee_id')::uuid
  WHERE p.payment_type = 'vote'
    AND p.status = 'successful'
  ON CONFLICT (payment_id) DO UPDATE
    SET vote_approval_status = 'approved',
        vote_count = EXCLUDED.vote_count;

  -- Recalculate totals
  UPDATE public.nominees n
  SET total_votes = (
    SELECT COALESCE(SUM(v.vote_count), 0)
    FROM public.votes v
    WHERE v.nominee_id = n.id
      AND v.vote_approval_status = 'approved'
  );
END;
$$;