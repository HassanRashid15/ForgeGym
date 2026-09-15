# Production hardening

Operational checklist for running Gym Journey Hub in production.

## Environment

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose to the client)
- `NEXT_PUBLIC_SITE_URL` (canonical live URL for email redirects, e.g. `https://your-app.vercel.app`).
  On Vercel, localhost values are ignored and the deploy Origin / `VERCEL_URL` is used instead.
  Also add the same URL under Supabase Auth → URL Configuration → Redirect URLs.

Optional:

- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — distributed rate limits
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` — exception monitoring

## Database

Apply migrations in `supabase/migrations`, including:

- `20260911_production_indexes.sql` — performance indexes
- `20260911_security_rls_and_gyms.sql` — closes public profiles SELECT, gym-scoped RLS,
  privilege-escalation trigger, and public `gyms` catalog (no PII)

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Or paste the SQL into the Supabase SQL Editor.

## Auth & SSR

- Public gym listing (`/`) and gym detail (`/gyms/[ownerId]`) are **server-rendered** (`revalidate: 60`) from `public.gyms` (fallback: profiles without email/phone/address).
- `@supabase/ssr` cookie sessions + `src/proxy.ts` gate `/dashboard` and `/profile`.
- Server layouts also `redirect()` when no cookie user is present.
- API routes still accept Bearer tokens (and fall back to cookies via `requireAuth`).

## API hardening

- Rate limits on login, register, check-account, check-verified, resend, geo (Upstash when configured).
- Profile POST/PATCH use an allowlist (`src/lib/profiles/allowlist.ts`); privileged columns are blocked in DB triggers too.
- Structured JSON logs via `src/lib/logger.ts`.
- Monitoring hooks via `src/lib/monitoring.ts` (+ optional Sentry).

## Error UX

- `src/app/error.tsx`, `global-error.tsx`, `dashboard/error.tsx`

## Tests

```bash
npm test
```

Covers rate limiting, roles, me-cache, password helpers, profile allowlist, authz contracts.
