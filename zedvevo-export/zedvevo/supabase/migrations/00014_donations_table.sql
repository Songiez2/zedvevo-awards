
-- Donations table for Stripe payments
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  amount numeric(10,2) not null,
  currency text not null default 'usd',
  message text,
  donor_name text,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  customer_email text,
  status text not null default 'pending' check (status in ('pending','completed','failed','cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_donations_user_id on public.donations(user_id);
create index if not exists idx_donations_stripe_session_id on public.donations(stripe_session_id);
create index if not exists idx_donations_status on public.donations(status);

alter table public.donations enable row level security;

create policy "Users can view own donations" on public.donations
  for select using (auth.uid() = user_id);

create policy "Service role can manage donations" on public.donations
  for all using (auth.jwt()->>'role' = 'service_role');
