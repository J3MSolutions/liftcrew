# LiftCrew mover app

The mobile app movers use to sign up, set their availability, request jobs, answer invitations and
standby offers, cancel when they must, see hours, tips and pay status, and read their own company reviews.
Built with Expo (SDK 53) and Expo Router, talking directly to the shared Supabase backend.
Business rules and the database contract are in [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md).

## Set up

1. **Environment.** Copy `.env.example` to `.env` in this folder and fill in your Supabase project's values
   (Supabase dashboard > Project Settings > API):

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

   Use the **anon (publishable) key only**. Never put the service-role key in the app: everything in an
   `EXPO_PUBLIC_` variable ships inside the app bundle. Row-level security and the database functions
   decide what each mover can read and change.

2. **Install.** From the **repo root** (npm workspaces link `@liftcrew/shared` into the app):

   ```sh
   npm install
   ```

3. **Line up Expo versions.** In `apps/mobile`:

   ```sh
   npx expo install --fix
   ```

   This corrects any Expo-managed package (React Native, screens, safe area, AsyncStorage…) to the exact
   version SDK 53 expects.

4. **Auth redirect URLs.** Sign-up confirmation and password-reset emails link back into the app at
   `/auth-callback`. In Supabase > Authentication > URL Configuration > Redirect URLs, add:
   - `liftcrew://auth-callback` (development and store builds)
   - `exp://**` (Expo Go during development; the exact URL looks like `exp://192.168.1.20:8081/--/auth-callback`)

## Run

```sh
cd apps/mobile
npx expo start
```

(or `npm run mobile` from the repo root). If you change `.env`, restart with `npx expo start --clear`.

### Test on a phone with Expo Go

1. Install **Expo Go** from the App Store or Google Play.
2. Put the phone on the same Wi-Fi network as your computer.
3. Run `npx expo start` and scan the QR code: with the Camera app on iPhone, or from inside Expo Go on Android.
   If your network blocks device-to-device traffic, use `npx expo start --tunnel`.
4. Create a mover account. If email confirmation is on in Supabase, open the confirmation email **on the
   phone** so the link opens the app; otherwise sign in after confirming.

To try the whole flow you also need a verified moving company posting jobs (company web app in `apps/web`)
and, for a mover to be bookable, `movers.id_verified = true` set by LiftCrew staff in the Supabase dashboard.

## What's in here

```
app/
  _layout.tsx            Providers (safe area, auth, toasts) and the root stack
  index.tsx              Gate: sends people to sign-in, onboarding, the company notice or Jobs
  (auth)/                Welcome, Sign up, Sign in, Forgot password
  auth-callback.tsx      Landing screen for email links (confirm sign-up, choose a new password)
  company.tsx            "This app is for movers" for company accounts, with Sign out
  onboarding.tsx         About you (create_mover_profile), then the ID and background check explanation
  (tabs)/
    jobs.tsx             Open jobs: request / withdraw request
    bookings.tsx         Invitations, standby, upcoming (cancel), completed and canceled, pay status
    availability.tsx     Days, rate, home base, license, roles, experience, bio, phone; ID status; sign out
    record.tsx           Private record: stats, company reviews, respond, dispute
src/
  lib/                   Supabase client, auth context, data hook, queries, badge, formatting
  components/            UI kit (buttons, fields, tickets, pills, sheets, toasts)
  theme.ts               Light and dark color tokens (moving-blanket blue, packing-tape kraft)
```

Every write is a database function called with `supabase.rpc()`, except the mover's own profile
columns and phone number, which the app updates directly as the security model allows.

Type-check with `npm run typecheck` (after installing).
