# Forge Gym (gym-journey-hub)

Next.js App Router gym membership and fitness platform, backed by Supabase Auth + Postgres.

## Stack

- **Next.js** (App Router, `src/` layout)
- **React** + **TypeScript**
- **Tailwind CSS** + shadcn/ui
- **Supabase** (auth, profiles, realtime)

## Project structure

```
public/images/           # static assets
src/
  app/                   # routes + API handlers
  api/                   # browser API client (endpoints.json)
  components/
    fitness/             # BMI / assessment widgets
    forms/               # shared form controls (address, etc.)
    layout/              # navbar, footer
    marketing/           # landing visuals / SEO / theme
    ui/                  # shadcn primitives in use
  contexts/              # AuthProvider
  data/                  # static catalog content
  hooks/
  integrations/supabase/ # browser Supabase client
  lib/supabase/          # server Supabase helpers
  types/
supabase/
  migrations/            # schema migrations only
  scripts/               # manual seed / repair SQL (SQL Editor)
```

## API pattern

1. Define endpoint in `src/api/endpoints.json`
2. Add/use Next.js route in `src/app/api/...`
3. UI calls helpers from `src/api/*` only

## Setup

```sh
npm install
npm run dev
```

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server only
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Scripts

| Command         | Description              |
|-----------------|--------------------------|
| `npm run dev`   | Start Next.js dev server |
| `npm run build` | Production build         |
| `npm run start` | Serve production build   |
| `npm run lint`  | Run Next.js ESLint       |
| `npm test`      | Run unit tests (Vitest)  |

## Production

See [docs/PRODUCTION.md](docs/PRODUCTION.md) for rate limits, SSR notes, indexes, monitoring, and deploy checklist.

