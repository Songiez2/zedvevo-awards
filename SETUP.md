# ZedVevo — Local Setup Guide

## Prerequisites
- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **npm 9+** (comes with Node) or pnpm

## 1. Use the local package.json
The downloaded zip includes `package.local.json` — use it instead of `package.json`:

```bash
# Rename for local use
cp package.local.json package.json

# Also use the local TypeScript configs
cp tsconfig.local.json tsconfig.json
cp tsconfig.app.local.json tsconfig.app.json
cp tsconfig.node.local.json tsconfig.node.json
```

## 2. Install Dependencies
```bash
npm install
```

## 3. Environment Variables
Copy `.env.example` to `.env.local` and fill in your Supabase values:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> **Find these** in Supabase Dashboard → Project Settings → API

## 4. Supabase Edge Function Secrets
Set these in **Supabase Dashboard → Settings → Edge Functions → Secrets**:

| Secret | Description |
|--------|-------------|
| `LIPILA_API_KEY` | Lipila payment API key |
| `LIPILA_WEBHOOK_URL` | Your deployed `lipila-webhook` edge function URL |
| `LIPILA_API_URL` | `https://blz.lipila.io` (prod) or `https://api.lipila.dev` (sandbox) |
| `RESEND_API_KEY` | Resend.com API key for email sending |
| `ADMIN_EMAIL` | Admin email address for notifications |
| `FROM_EMAIL` | Verified sender email, e.g. `noreply@zedvevo.com` |

## 5. Run Database Migrations
Apply all migrations from `supabase/migrations/` in numeric order via the Supabase SQL Editor, or use the CLI:
```bash
supabase db push
```

## 6. Deploy Edge Functions
```bash
supabase functions deploy lipila-payment
supabase functions deploy lipila-webhook
supabase functions deploy send-email
supabase functions deploy help-message
supabase functions deploy create-donation-checkout
supabase functions deploy verify-donation-payment
supabase functions deploy generate-thumbnail
supabase functions deploy weekly-trending
supabase functions deploy admin-reset-password
supabase functions deploy set-admin-password
```

## 7. Start Dev Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173)

## 8. Build for Production
```bash
npm run build
```
Output is in `dist/`. Deploy to Vercel, Netlify, or any static host.

---

## Admin Access
- Visit `/admin` (redirects non-admins)
- Set a user's role to `admin` or `super_admin` in the Supabase `profiles` table

## Tech Stack
- React 18 + TypeScript + Vite 5
- Tailwind CSS 3 + shadcn/ui
- Supabase (Auth, Database, Storage, Edge Functions, Realtime)
- Lipila mobile-money payments
- Resend transactional email
