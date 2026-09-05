
-- Add payments and profiles tables to Realtime publication
-- so frontend Realtime channels fire on payment status changes and role promotions
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
