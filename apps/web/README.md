# LiftCrew web app (moving companies)

Next.js 15 (App Router) app where moving companies post jobs, book movers, manage standby and
cancellations, record hours, tips and pay status, export pay records and review movers.
Movers use the Expo app in `apps/mobile`. Both talk to the same Supabase project; every rule
lives in the database (`supabase/migrations`), see `docs/ARCHITECTURE.md`.

## Setup

1. Install from the repo root: `npm install`
2. Copy the env file: `cp apps/web/.env.example apps/web/.env.local`
3. Fill in the two values:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page → Project API keys → `anon` / publishable key |

Only the anon (publishable) key belongs here. Row-level security and the database functions
decide what each user can see and do, so the app never needs any other key.

For a local Supabase (`supabase start`), the URL is `http://127.0.0.1:54321` and the anon key is
printed by `supabase status`.

## Run

```bash
npm run dev -w @liftcrew/web   # or, from the repo root: npm run web
```

Open http://localhost:3000.

Other scripts: `npm run build -w @liftcrew/web`, `npm run start -w @liftcrew/web`,
`npm run typecheck -w @liftcrew/web`.

## Supabase Auth settings

- Authentication → URL Configuration: set the Site URL to your web address and add
  `http://localhost:3000/auth/callback` (and your production `/auth/callback`) to Redirect URLs.
  Sign-up confirmation and password-reset emails land on `/auth/callback`.
- Sign-up sends `account_type: 'company'` in user metadata; the database trigger creates the profile.

## Account flow

1. `/signup` → confirm email → `/onboarding` (company name, city, Cal-T permit, insurance expiry, job prefix).
2. `/verifying` until LiftCrew staff set `companies.verified = true` after checking the permit and insurance.
3. Verified companies reach `/jobs`, `/jobs/new`, `/movers`, `/pay` and `/settings`.

Mover accounts that sign in here are told to use the mobile app and signed out.

## Layout

- `app/` routes. `app/(app)/` is the signed-in shell (nav with badge counts).
- `components/` UI, grouped by area (`jobs/`, `movers/`, `pay/`, `auth/`).
- `lib/` Supabase clients (`lib/supabase/`), data loaders (`jobs.ts`, `movers.ts`, `pay.ts`) and the
  typed RPC wrapper (`rpc.ts`). Shared types, constants, formatting and export builders come from
  `@liftcrew/shared`.
