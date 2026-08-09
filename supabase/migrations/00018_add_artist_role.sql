-- Add the artist role without changing existing users or data.
-- The verified Lipila webhook assigns it after an upload plan payment succeeds.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'artist';
