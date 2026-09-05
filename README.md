# ZedVevo 🎵

**Zambian music & video streaming platform** — upload, discover, stream, and support local artists.

## Features

- 🎵 Stream music & watch videos inline (YouTube-style player)
- 🎬 Auto-generated video thumbnails from uploaded files
- 🏆 ZedVevo Awards & fan voting
- ❤️ Donate to ZedVevo via Lipila mobile money (ZMW)
- 📤 Upload songs & videos (pending admin approval)
- 🔍 Search, trending charts, personal library & downloads
- 🔔 Real-time notifications
- 🛡️ Role-based access control (admin / artist / fan)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions) |
| Payments | Lipila mobile money (ZMW) |
| Deployment | Vercel |

## Local Development

### Requirements

- **Node.js ≥ 20** (v20 LTS recommended — see `.nvmrc`)
- **npm ≥ 10**

```bash
# If you use nvm, switch to the right version automatically:
nvm use

# Verify
node -v   # v20.x.x
npm -v    # 10.x.x
```

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in your Supabase keys
cp .env.example .env.local
# Edit .env.local with your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Start dev server
npm run dev
# Open http://localhost:5173
```

### Environment Variables

Create `.env.local` (never commit this file — it's in `.gitignore`):

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Find these in **Supabase Dashboard → Project Settings → API**.

### Supabase Edge Function Secrets

Set these in **Supabase Dashboard → Settings → Edge Functions → Secrets**:

| Secret | Description |
|---|---|
| `LIPILA_API_KEY` | Your Lipila secret key (starts with `Lsk`) |
| `LIPILA_WEBHOOK_URL` | Public URL of the `lipila-webhook` edge function |
| `LIPILA_API_URL` | `https://blz.lipila.io` (production) or `https://api.lipila.dev` (sandbox) |

## Deploy to Vercel

1. Push to GitHub
2. Import repo at [vercel.com/new](https://vercel.com/new)
3. Add env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
4. Deploy — `vercel.json` handles SPA routing automatically

## Project Structure

```
├── index.html               # HTML entry point
├── package.json             # Dependencies & scripts
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind CSS config
├── tsconfig.app.json        # TypeScript (app)
├── .env.example             # Env template (safe to commit)
├── supabase/
│   ├── migrations/          # All DB migrations (in order)
│   └── functions/           # Edge Functions (Deno)
│       ├── lipila-payment/
│       ├── lipila-webhook/
│       └── verify-donation-payment/
└── src/
    ├── main.tsx             # React entry
    ├── App.tsx              # Root component + routing
    ├── routes.tsx           # Route definitions
    ├── index.css            # Global styles + CSS variables
    ├── types/               # TypeScript interfaces
    ├── lib/                 # api.ts, utils.ts
    ├── db/                  # Supabase client
    ├── contexts/            # React contexts (Auth, Theme)
    ├── hooks/               # Custom hooks
    ├── components/
    │   ├── ui/              # shadcn/ui base components
    │   ├── common/          # Shared components
    │   ├── audio/           # Music player
    │   ├── video/           # Video player & cards
    │   ├── donation/        # Donation dialog
    │   └── layouts/         # Page layouts & nav
    └── pages/               # Route pages
```

## Admin Access

Admin users are identified by role in the `profiles` table. Set a user's role to `admin` in Supabase to grant full access.

## Scripts

```bash
npm run dev      # Start Vite dev server
npm run build    # TypeScript check + Vite production build
npm run lint     # Biome lint + Tailwind CSS check
npm run preview  # Preview production build locally
```
