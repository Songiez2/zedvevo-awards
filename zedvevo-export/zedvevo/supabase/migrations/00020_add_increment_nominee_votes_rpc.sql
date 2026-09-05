
-- RPC to atomically increment/decrement nominee total_votes
CREATE OR REPLACE FUNCTION increment_nominee_votes(nom_id uuid, delta integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE nominees
  SET total_votes = GREATEST(0, COALESCE(total_votes, 0) + delta)
  WHERE id = nom_id;
END;
$$;

-- Enable realtime for nominees so AwardsPage auto-refreshes
ALTER PUBLICATION supabase_realtime ADD TABLE nominees;
