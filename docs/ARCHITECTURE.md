# LiftCrew architecture

LiftCrew lets **moving companies** book **movers** for jobs. Two apps share one Supabase backend:

| Part | Folder | Who uses it | Stack |
|---|---|---|---|
| Company web app | `apps/web` | Moving company owners and dispatchers | Next.js (App Router) + `@supabase/ssr` |
| Mover mobile app | `apps/mobile` | Movers | Expo (React Native) + Expo Router + `@supabase/supabase-js` |
| Shared code | `packages/shared` | Both apps | Types, constants, formatting, sensitive-number check, pay-record exports |
| Backend | `supabase/` | — | Postgres schema, row-level security, database functions (RPCs) |

## Business rules

- **Each booking company is the mover's employer for that job** and pays through its own payroll.
  LiftCrew never moves money for wages, tips or standby pay. It **records** hours, wages, tips and
  whether the company marked them paid. LiftCrew's only charge is a **$20 booking fee** per accepted booking,
  invoiced monthly (`my_booking_fees()`).
- First time a company books a mover, a **hiring paperwork** record (`hires`) starts as `needed`. The company
  sends its own W-4, California DE 4 and I-9 outside LiftCrew, then marks it `sent`, then `done`.
- **Standby**: a company can offer up to 2 standby movers per job. If a crew member cancels, the first
  standby mover who accepted moves into the spot automatically (`cancel_booking`). If nobody cancels, each
  accepted standby mover is owed **$25 standby pay** when the job is completed.
- **Cancellations** by a mover less than **48 hours** before the start are flagged `late_cancel` and count on
  their record.
- **Reviews** are written by the company after a completed booking: showed up (y/n), on time (y/n),
  would book again (y/n), up to six fixed strengths, optional note (280 chars).
  **Visible to verified companies and to the reviewed mover only. Other movers never see them.**
  The mover can post one response and open one dispute per review.
- **Verified companies only.** A company account starts unverified. LiftCrew staff check the Cal-T permit
  and insurance and set `companies.verified = true` in the Supabase dashboard. Until then the company can't
  post jobs, browse movers or read reviews. Show a "We're verifying your company" screen.
- **ID-verified movers only** can be booked or offered standby. Staff set `movers.id_verified = true`
  (later: an ID-verification vendor webhook). LiftCrew never stores ID photos or license numbers.
- **Never stored**: Social Security, bank or card numbers, tax forms, ID photos, background reports.
  Free-text fields reject anything shaped like those numbers (database checks + `containsSensitiveNumber()`).
- Times are California time (`America/Los_Angeles`). Job dates are calendar dates.

## Security model

All of it lives in `supabase/migrations/20261011000000_core.sql` and is tested by
`supabase/tests/run_local.sh` (96 checks, including a regression test for every finding of the independent security review).

- Clients get **SELECT only** on tables, plus UPDATE on a few profile columns:
  - `companies`: `city, payroll_portal_name, payroll_portal_url` (name, permit and insurance changes go through LiftCrew staff, who re-verify)
  - `movers`: `full_name, city, roles, license, years_experience, asking_rate, bio, available_days`
  - `mover_private`: `phone`
- **Every other write is a database function** called with `supabase.rpc(name, args)`. Each checks the
  caller and raises a plain-English error message (show `error.message` to the user via `friendlyError()`).
- Row visibility:
  - `movers`: the mover themself, and verified companies.
  - `mover_private` (phone): the mover, and companies with a **confirmed** booking (or completed in the last 14 days). A pending invitation does not unlock it. Phones are normalized to `(707) 555-0101`; anything that isn't a 10-digit US number is refused.
  - `jobs`: the owning company; movers see open jobs dated today or later, plus any job they requested,
    were booked on, or were offered standby on.
  - `bookings`, `standby`, `job_requests`: the mover involved and the job's company.
  - `hires`: that company and that mover.
  - `reviews`, `review_responses`, `review_disputes`: verified companies, and the reviewed mover.
  - `companies`: any signed-in user can read only `id, name, city, verified, job_prefix, payroll_portal_name, payroll_portal_url, created_at` of verified companies. The owner reads the full record (permit, insurance) with `rpc('my_company')`.
  - Reviews whose dispute LiftCrew staff marked `removed` disappear for everyone and stop counting in `mover_stats`.
  - Nothing about a booking can be withdrawn or canceled once the job's start time has passed; the company completes the job instead (0 hours for anyone who didn't work).
  - Only the functions listed below are executable by signed-in users; internal helpers are not.
- Use only the **anon/publishable key** in the apps. Never ship the service-role key.

## Tables (columns the apps use)

See `packages/shared/src/types.ts` for exact TypeScript types.

- `profiles(id, account_type 'company'|'mover')` — created by a trigger at sign-up from
  `options.data.account_type`. **Sign-up must pass `{ data: { account_type: 'company' | 'mover' } }`.**
- `companies(id, owner_id, name, city, permit_number, insurance_expires, verified, job_prefix, payroll_portal_name, payroll_portal_url)`
- `movers(id, full_name, city, roles[], license, years_experience, asking_rate, bio, available_days[], id_verified, background)`
- `mover_private(mover_id, phone)`
- `jobs(id, company_id, job_number, work_date, start_time, est_hours, route, description, crew_size, role, hourly_rate, truck, status)`
- `job_requests(job_id, mover_id, created_at)`
- `bookings(id, job_id, mover_id, status, hourly_rate, est_hours, cancel_reason, late_cancel, replaced_by_booking, from_standby, hours_worked, wages, tip, pay_status, paid_at)`
  - status: `pending` (invited, waiting on mover) → `confirmed` → `completed`; or `declined`, `canceled` (by mover), `withdrawn` (by company)
  - pay_status: `upcoming` → `due` → `paid`; `none` when nothing is owed
- `standby(id, job_id, mover_id, status, standby_pay, pay_status)`
  - status: `offered` → `accepted` → `promoted` (moved into crew) or `held` (job finished, owed standby pay); or `declined`, `withdrawn`
- `hires(company_id, mover_id, status 'needed'|'sent'|'done')`
- `reviews(id, booking_id, job_id, company_id, mover_id, showed, on_time, rebook, strengths[], note, created_at)`
- `review_responses(review_id, body)`, `review_disputes(id, review_id, reason, status)`

Joins work through PostgREST embedding, e.g.
`supabase.from('bookings').select('*, jobs(*, companies(name)), movers(full_name)')`.
Embedded rows are still filtered by row-level security (a mover embedding `movers` on someone else's row gets `null`).

## Database functions (RPCs)

Arguments are in `RpcArgs` in `packages/shared/src/types.ts`. Each returns the changed row.

Company (caller must own a verified company):
- `create_company(p_name, p_city, p_permit_number, p_insurance_expires, p_job_prefix)` — onboarding; works before verification
- `my_company()` — the caller's full company row (use `.maybeSingle()`)
- `post_job(p_work_date, p_start_time, p_est_hours, p_route, p_description, p_crew_size, p_role, p_hourly_rate, p_truck)`
- `invite_mover(p_job, p_mover)` → pending booking the mover must accept
- `book_requester(p_job, p_mover)` → confirmed booking for a mover who requested the job
- `withdraw_booking(p_booking)`, `cancel_job(p_job)`
- `set_hire_status(p_mover, p_status 'sent'|'done')`
- `offer_standby(p_job, p_mover)`, `withdraw_standby(p_standby)`
- `complete_job(p_job, p_entries [{booking_id, hours, tip}], p_already_paid)` — job date must be today or past; every confirmed booking needs an entry
- `mark_paid(p_booking)`, `mark_standby_paid(p_standby)`, `record_tip(p_booking, p_tip)` (adds to tip, sets pay due)
- `submit_review(p_booking, p_showed, p_on_time, p_rebook, p_strengths, p_note)`
- `my_booking_fees(p_month?)` → `[{month, bookings, fee_each, total}]`

Mover (caller must have a mover profile):
- `create_mover_profile(p_full_name, p_city, p_roles, p_license, p_years, p_asking_rate, p_bio, p_available_days, p_phone)`
- `request_job(p_job)`, `withdraw_request(p_job)`
- `respond_booking(p_booking, p_accept)`
- `cancel_booking(p_booking, p_reason)` — reason is one of `CANCEL_REASONS`
- `respond_standby(p_standby, p_accept)` — `false` on an accepted offer = step down
- `respond_to_review(p_review, p_body)`, `dispute_review(p_review, p_reason)`

Either:
- `mover_stats(p_movers uuid[])` → `[{mover_id, jobs_completed, reviews, on_time_pct, rebook_pct, no_shows, late_cancels}]`
  (companies: any mover; movers: only themselves)
- `open_spots(p_job)` → int

## Look and feel

Match the approved prototype (`docs/prototype.html`): moving-blanket blue and packing-tape kraft,
job "tickets" with a tape strip, condensed display headings.

| Token | Light | Dark |
|---|---|---|
| bg | `#eef1f4` | `#0f151d` |
| surface | `#ffffff` | `#18212c` |
| sunk | `#f6f8fa` | `#131b24` |
| ink | `#14202e` | `#e6ebf1` |
| muted | `#5a6878` | `#93a1b0` |
| line | `#d5dce4` | `#2a3644` |
| blanket (primary) | `#23488f` | `#86a8ec` |
| blanket-soft | `#e3eaf7` | `#1f2c45` |
| kraft-tape | `#d8b47e` | `#8a6a3c` |
| kraft-soft | `#f5ead8` | `#2e261b` |
| ok / ok-soft | `#1f7a4d` / `#e1f2e9` | `#66c896` / `#173326` |
| warn / warn-soft | `#9a5800` / `#fbeedb` | `#e8a64f` / `#352612` |
| bad / bad-soft | `#b3261e` / `#fbe4e2` | `#f2908a` / `#3a1c1a` |

Fonts: Barlow Condensed 600/700 (headings), Public Sans (body), IBM Plex Mono (numbers, job numbers).

Copy rules: plain, active voice; buttons say what happens ("Mark paid", "Request this job");
errors say what went wrong and how to fix it. Reuse strings from `COPY` in `packages/shared/src/constants.ts`.
