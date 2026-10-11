# LiftCrew

Moving companies book movers for busy days. Movers list their availability, get booked, and see their record.
Companies leave reviews that only other verified companies (and the reviewed mover) can see.

- **Company web app**: `apps/web` (Next.js)
- **Mover mobile app**: `apps/mobile` (Expo, iPhone and Android)
- **Backend**: Supabase (Postgres database, logins, privacy rules) in `supabase/`
- **Shared code**: `packages/shared`
- How it all fits together: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). The approved clickable prototype: `docs/prototype.html`.

> **Status:** first build. The database and its privacy rules are tested (96 checks). The two apps were written
> without being able to install packages, so the first `npm install` and run may surface small errors. Fix them
> as they come up, or paste the error into Claude.

## Run it on your Mac (about 30 minutes the first time)

### 1. Install the tools
- **Node.js 22 LTS** from [nodejs.org](https://nodejs.org) (the macOS installer).
- **Expo Go** on your phone, from the App Store or Google Play, to try the mover app.

### 2. Create the database (free)
1. Sign up at [supabase.com](https://supabase.com) and create a new project. Pick a region near California and save the database password somewhere safe.
2. In the project, open **SQL Editor → New query**. Paste the whole contents of
   `supabase/migrations/20261011000000_core.sql` and click **Run**. It should say "Success".
3. Open **Authentication → URL Configuration**:
   - **Site URL:** `http://localhost:3000` (change to your real web address when you launch)
   - **Redirect URLs:** add `http://localhost:3000/auth/callback`, `liftcrew://auth-callback` and `exp://**`
4. Open **Project Settings → API** (or **API Keys**) and copy the **Project URL** and the **anon / publishable** key.
   Never put the `service_role` / secret key in either app.

### 3. Add your keys
Copy each example file and paste in the two values from step 2.4:

```bash
cd ~/Documents/LiftCrew
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
open -e apps/web/.env.local apps/mobile/.env
```

### 4. Install and start
```bash
cd ~/Documents/LiftCrew
npm install
(cd apps/mobile && npx expo install --fix)
npm run web        # company app at http://localhost:3000
```
In a second Terminal window:
```bash
cd ~/Documents/LiftCrew
npm run mobile     # scan the QR code with your phone's camera (Expo Go)
```

### 5. Try it end to end
1. **Company:** sign up at http://localhost:3000, confirm your email, and fill in onboarding.
   You'll land on "We're verifying your company".
2. **Verify it (you are LiftCrew staff):** in Supabase, open **Table Editor → companies**, set `verified` to `true`
   for that row, then refresh the web app.
3. **Mover:** in Expo Go, sign up with a different email and complete your profile.
4. **Verify the mover:** in **Table Editor → movers**, set `id_verified` to `true` and `background` to `clear`.
5. Post a job as the company, request or invite, accept on the phone, and so on.

Supabase's built-in email sender only allows a few emails per hour, which is enough for testing.
Set up your own email sender (Authentication → SMTP) before real users arrive.

## Tests
```bash
npm test          # shared code: exports, date handling, sensitive-number check
npm run test:db   # database privacy and booking rules (needs Postgres: brew install postgresql@16)
```

## Put the company app online
1. At [vercel.com](https://vercel.com), sign in with GitHub and import `J3MSolutions/liftcrew`.
2. Set **Root Directory** to `apps/web` and add the two `NEXT_PUBLIC_SUPABASE_...` variables.
3. Deploy. Then add `https://<your-site>/auth/callback` to Supabase's Redirect URLs and set it as the Site URL.

The mover app is published to the App Store and Google Play with Expo's EAS Build (`npx eas build`),
which needs an Apple Developer account ($99/year) and a Google Play account ($25 one time).

## Before real customers
- **Lawyer review** (California employment): the employer-of-record model, standby pay, and especially the
  shared company reviews, which may count as consumer reports under the federal FCRA and California ICRAA.
- **ID verification and background checks** through licensed vendors (for example Persona or Stripe Identity,
  and Checkr). Right now LiftCrew staff set `id_verified` and `background` by hand.
- **Privacy policy and terms of service**, including how movers see, respond to and dispute their record.
- **Supabase paid plan** for daily backups, and your own email sender.
- **The GitHub repository is public**, so anyone can read this code. It contains no passwords or keys; keep it that way.
- Round two features: pay-record exports in the web app are built; tax-document requests and the direct
  accounting connection from the prototype are not yet.

## How data is protected
All rules live in the database, so they hold even if someone calls the API directly:
- Reviews: only verified companies and the reviewed mover can read them. Other movers never can.
- A mover's phone is visible only to companies that have a confirmed booking with them.
- Every change goes through a database function that checks who's asking.
- LiftCrew never stores Social Security, bank or card numbers, tax forms, ID photos or background reports.
  Text fields refuse anything shaped like those numbers.
