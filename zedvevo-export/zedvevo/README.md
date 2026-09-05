# ZedVevo — Zambian Music & Video Platform

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local — add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Run dev server
npm run dev
```

## Stack
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (DB, Auth, Storage, Edge Functions)

## Supabase Setup
1. Create a new project at supabase.com
2. Run all SQL files in `supabase/migrations/` in order (00001 → 00021)
3. Deploy Edge Functions: `supabase functions deploy --project-ref YOUR_REF`
4. Add secrets in Supabase Dashboard → Edge Functions → Secrets:
   - `RESEND_API_KEY` — for email delivery (get from resend.com)
   - `ADMIN_EMAIL` — admin notification email
   - `FROM_EMAIL` — sender address (e.g. noreply@yourdomain.com)
   - `LIPILA_API_KEY` — Lipila payment gateway key
