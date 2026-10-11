-- LiftCrew core schema
-- Moving companies post jobs and book movers. Each booking company is the mover's employer
-- for that job and pays through its own payroll; LiftCrew only records hours, tips and pay status.
--
-- Security model (enforced here, not in the apps):
--   * All writes go through SECURITY DEFINER functions (RPCs) that check who is calling.
--     Clients only get SELECT on tables, plus UPDATE on a few profile columns.
--   * "Company" means the owner of a VERIFIED company (permit + insurance checked by LiftCrew staff).
--     An unverified company account can't see movers or reviews, so a mover can't sign up as a
--     company to read reviews.
--   * Reviews are readable by verified companies and by the reviewed mover only. Never other movers.
--   * A mover's phone number is visible only to the mover and to companies with a current booking.
--   * LiftCrew stores no Social Security, bank or card numbers, tax forms, ID photos or background
--     reports. Free-text fields reject anything that looks like an ID or account number.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.account_type      as enum ('company', 'mover');
create type public.work_role         as enum ('Helper', 'Driver', 'Packer', 'Crew lead');
create type public.license_class     as enum ('None', 'Class C', 'Class B', 'Class A');
create type public.job_status        as enum ('open', 'completed', 'canceled');
create type public.booking_status    as enum ('pending', 'confirmed', 'completed', 'declined', 'canceled', 'withdrawn');
create type public.pay_status        as enum ('upcoming', 'due', 'paid', 'none');
create type public.standby_status    as enum ('offered', 'accepted', 'declined', 'promoted', 'held', 'withdrawn');
create type public.hire_status       as enum ('needed', 'sent', 'done');
create type public.background_status as enum ('not_started', 'pending', 'clear', 'not_clear');
create type public.cancel_reason     as enum ('Sick', 'Family emergency', 'Car or truck trouble', 'Schedule conflict', 'Other');
create type public.dispute_status    as enum ('open', 'upheld', 'removed');

-- ---------------------------------------------------------------------------
-- Settings and small helpers
-- ---------------------------------------------------------------------------
create function public.app_timezone() returns text language sql immutable as $$ select 'America/Los_Angeles' $$;
create function public.app_today() returns date language sql stable as $$ select (now() at time zone public.app_timezone())::date $$;
create function public.standby_pay_amount() returns numeric language sql immutable as $$ select 25.00::numeric $$;
create function public.booking_fee_amount() returns numeric language sql immutable as $$ select 20.00::numeric $$;
create function public.late_cancel_window() returns interval language sql immutable as $$ select interval '48 hours' $$;
create function public.max_standby_per_job() returns int language sql immutable as $$ select 2 $$;

-- True when text contains something shaped like a Social Security, card or bank account number.
create function public.contains_sensitive_number(t text) returns boolean
language sql immutable as $$
  select coalesce(t, '') ~ '(^|[^0-9])[0-9]{3}[-. ][0-9]{2}[-. ][0-9]{4}([^0-9]|$)'  -- 123-45-6789, 123.45.6789
      or coalesce(t, '') ~ '(^|[^0-9])[0-9]{3}[-. ][0-9]{3}[-. ][0-9]{3}([^0-9]|$)'     -- 123 456 789
      or coalesce(t, '') ~ '(^|[^0-9])[0-9]{9,17}([^0-9]|$)'                          -- 123456789, bank accounts
      or coalesce(t, '') ~ '(^|[^0-9])([0-9][ .-]?){12,18}[0-9]([^0-9]|$)'            -- card numbers with separators
$$;

create function public.clean_text(t text, max_len int) returns text
language plpgsql immutable as $$
declare v text := nullif(btrim(coalesce(t, '')), '');
begin
  if v is null then return null; end if;
  if char_length(v) > max_len then
    raise exception 'Text is too long (max % characters).', max_len using errcode = '22001';
  end if;
  if public.contains_sensitive_number(v) then
    raise exception 'Remove the ID or account number. LiftCrew doesn''t store Social Security, card or bank numbers.'
      using errcode = '22023';
  end if;
  return v;
end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  account_type public.account_type not null,
  created_at   timestamptz not null default now()
);

create table public.companies (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null unique references public.profiles (id) on delete cascade,
  name                text not null check (char_length(name) between 2 and 120 and not public.contains_sensitive_number(name)),
  city                text not null check (char_length(city) between 2 and 80 and not public.contains_sensitive_number(city)),
  permit_number       text not null check (permit_number ~ '^[A-Z0-9-]{4,20}$'),   -- BHGS Cal-T number, public record
  insurance_expires   date not null,
  verified            boolean not null default false,                              -- set by LiftCrew staff only
  job_prefix          text not null check (job_prefix ~ '^[A-Z]{2,4}$'),
  next_job_seq        int not null default 1000,
  payroll_portal_name text check (char_length(payroll_portal_name) <= 60 and not public.contains_sensitive_number(payroll_portal_name)),
  payroll_portal_url  text check (payroll_portal_url ~ '^https://[^[:space:]]{3,}$' and char_length(payroll_portal_url) <= 300),
  created_at          timestamptz not null default now()
);

create table public.movers (
  id               uuid primary key references public.profiles (id) on delete cascade,
  full_name        text not null check (char_length(full_name) between 2 and 80 and not public.contains_sensitive_number(full_name)),
  city             text not null check (char_length(city) between 2 and 80 and not public.contains_sensitive_number(city)),
  roles            public.work_role[] not null check (cardinality(roles) between 1 and 4),
  license          public.license_class not null default 'None',
  years_experience int not null default 0 check (years_experience between 0 and 60),
  asking_rate      numeric(6,2) not null check (asking_rate > 0 and asking_rate <= 500),
  bio              text check (char_length(bio) <= 600 and not public.contains_sensitive_number(bio)),
  available_days   text[] not null default '{}'
                   check (available_days <@ array['Mon','Tue','Wed','Thu','Fri','Sat','Sun']),
  id_verified      boolean not null default false,                    -- set by the ID-check webhook / staff
  background       public.background_status not null default 'not_started', -- result only, never the report
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.mover_private (
  mover_id uuid primary key references public.movers (id) on delete cascade,
  phone    text not null check (phone ~ '^\([0-9]{3}\) [0-9]{3}-[0-9]{4}$')   -- stored as (707) 555-0101
);

-- Accepts any common US format and stores (XXX) XXX-XXXX. Anything that isn't a 10-digit US number is refused,
-- so an SSN or account number can't be saved as a "phone".
create function public.normalize_phone() returns trigger language plpgsql as $$
declare d text := regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g');
begin
  if char_length(d) = 11 and left(d, 1) = '1' then d := substr(d, 2); end if;
  if char_length(d) <> 10 or left(d, 1) in ('0', '1') then
    raise exception 'Enter a 10-digit US mobile number.' using errcode = '22023';
  end if;
  new.phone := '(' || substr(d, 1, 3) || ') ' || substr(d, 4, 3) || '-' || substr(d, 7, 4);
  return new;
end $$;
create trigger mover_private_phone before insert or update on public.mover_private
  for each row execute function public.normalize_phone();

create table public.jobs (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  job_number   text not null unique,
  work_date    date not null,
  start_time   time not null,
  est_hours    numeric(4,2) not null check (est_hours between 0.5 and 16),
  route        text not null check (char_length(route) between 2 and 120 and not public.contains_sensitive_number(route)),
  description  text not null check (char_length(description) between 2 and 240 and not public.contains_sensitive_number(description)),
  crew_size    int not null check (crew_size between 1 and 20),
  role         public.work_role not null,
  hourly_rate  numeric(6,2) not null check (hourly_rate > 0 and hourly_rate <= 500),
  truck        text not null check (char_length(truck) <= 60 and not public.contains_sensitive_number(truck)),
  status       public.job_status not null default 'open',
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);
create index jobs_company_idx on public.jobs (company_id, work_date);
create index jobs_open_idx on public.jobs (work_date) where status = 'open';

create table public.job_requests (
  job_id     uuid not null references public.jobs (id) on delete cascade,
  mover_id   uuid not null references public.movers (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (job_id, mover_id)
);

create table public.bookings (
  id                  uuid primary key default gen_random_uuid(),
  job_id              uuid not null references public.jobs (id) on delete cascade,
  mover_id            uuid not null references public.movers (id) on delete cascade,
  status              public.booking_status not null,
  hourly_rate         numeric(6,2) not null,
  est_hours           numeric(4,2) not null,
  created_at          timestamptz not null default now(),
  responded_at        timestamptz,
  canceled_at         timestamptz,
  cancel_reason       public.cancel_reason,
  late_cancel         boolean not null default false,
  replaced_by_booking uuid references public.bookings (id),
  from_standby        boolean not null default false,
  hours_worked        numeric(5,2) check (hours_worked between 0 and 24),
  wages               numeric(10,2) check (wages >= 0),
  tip                 numeric(10,2) not null default 0 check (tip >= 0 and tip <= 10000),
  pay_status          public.pay_status not null default 'upcoming',
  paid_at             timestamptz
);
create unique index bookings_one_active_per_mover on public.bookings (job_id, mover_id)
  where status in ('pending', 'confirmed', 'completed');
create index bookings_mover_idx on public.bookings (mover_id);
create index bookings_job_idx on public.bookings (job_id);

create table public.standby (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references public.jobs (id) on delete cascade,
  mover_id     uuid not null references public.movers (id) on delete cascade,
  status       public.standby_status not null default 'offered',
  standby_pay  numeric(10,2),
  pay_status   public.pay_status not null default 'upcoming',
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  paid_at      timestamptz
);
create unique index standby_one_active_per_mover on public.standby (job_id, mover_id)
  where status in ('offered', 'accepted');
create index standby_mover_idx on public.standby (mover_id);

-- Hiring paperwork status. The company sends its own W-4 / DE 4 / I-9; LiftCrew stores only the status.
create table public.hires (
  company_id uuid not null references public.companies (id) on delete cascade,
  mover_id   uuid not null references public.movers (id) on delete cascade,
  status     public.hire_status not null default 'needed',
  updated_at timestamptz not null default now(),
  primary key (company_id, mover_id)
);

create table public.reviews (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  job_id     uuid not null references public.jobs (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  mover_id   uuid not null references public.movers (id) on delete cascade,
  showed     boolean not null,
  on_time    boolean not null,
  rebook     boolean not null,
  strengths  text[] not null default '{}' check (strengths <@ array[
               'Careful with furniture','Strong on stairs','Safe driver','Fast packer',
               'Good with customers','Takes direction well']),
  note       text check (char_length(note) <= 280 and not public.contains_sensitive_number(note)),
  created_at timestamptz not null default now(),
  check (showed or not on_time)
);
create index reviews_mover_idx on public.reviews (mover_id, created_at desc);

create table public.review_responses (
  review_id  uuid primary key references public.reviews (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 280 and not public.contains_sensitive_number(body)),
  created_at timestamptz not null default now()
);

create table public.review_disputes (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid not null unique references public.reviews (id) on delete cascade,
  reason      text not null check (char_length(reason) between 1 and 500 and not public.contains_sensitive_number(reason)),
  status      public.dispute_status not null default 'open',
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Identity helpers (SECURITY DEFINER so policies can use them without recursion)
-- ---------------------------------------------------------------------------
create function public.my_company_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select c.id from public.companies c where c.owner_id = auth.uid() and c.verified
$$;

create function public.is_company() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.companies c where c.owner_id = auth.uid() and c.verified)
$$;

create function public.is_mover() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.movers m where m.id = auth.uid())
$$;

-- Company may see this mover's phone once the mover has accepted (confirmed), and for 14 days after a completed job.
-- A pending invitation does not unlock it, so invite-then-withdraw can't be used to collect numbers.
create function public.company_can_contact(p_mover uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.bookings b join public.jobs j on j.id = b.job_id
    where b.mover_id = p_mover
      and j.company_id = public.my_company_id()
      and (b.status = 'confirmed'
           or (b.status = 'completed' and j.work_date >= public.app_today() - 14))
  )
$$;

-- Jobs a mover is involved in (request, booking or standby) stay visible to them after they close.
create function public.mover_involved_in_job(p_job uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.bookings b where b.job_id = p_job and b.mover_id = auth.uid())
      or exists (select 1 from public.standby s where s.job_id = p_job and s.mover_id = auth.uid())
      or exists (select 1 from public.job_requests r where r.job_id = p_job and r.mover_id = auth.uid())
$$;

create function public.review_removed(p_review uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.review_disputes d where d.review_id = p_review and d.status = 'removed')
$$;

-- Open spots on a job the caller can see (their company's job, or any job for a mover).
create function public.open_spots(p_job uuid) returns int
language sql stable security definer set search_path = '' as $$
  select j.crew_size - (select count(*)::int from public.bookings b
                        where b.job_id = j.id and b.status in ('pending','confirmed'))
  from public.jobs j
  where j.id = p_job
    and (j.company_id = public.my_company_id() or public.is_mover() or auth.uid() is null)
$$;

create function public.job_starts_at(p_job uuid) returns timestamptz
language sql stable security definer set search_path = '' as $$
  select (j.work_date + j.start_time) at time zone public.app_timezone() from public.jobs j where j.id = p_job
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.companies        enable row level security;
alter table public.movers           enable row level security;
alter table public.mover_private    enable row level security;
alter table public.jobs             enable row level security;
alter table public.job_requests     enable row level security;
alter table public.bookings         enable row level security;
alter table public.standby          enable row level security;
alter table public.hires            enable row level security;
alter table public.reviews          enable row level security;
alter table public.review_responses enable row level security;
alter table public.review_disputes  enable row level security;

create policy profiles_self on public.profiles for select to authenticated using (id = auth.uid());

-- Company names and cities show on jobs; the owner also sees their own unverified company.
create policy companies_read on public.companies for select to authenticated
  using (verified or owner_id = auth.uid());
create policy companies_update_own on public.companies for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Movers are visible to verified companies and to themselves. Never to other movers.
create policy movers_read on public.movers for select to authenticated
  using (id = auth.uid() or public.is_company());
create policy movers_update_own on public.movers for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy mover_private_read on public.mover_private for select to authenticated
  using (mover_id = auth.uid() or public.company_can_contact(mover_id));
create policy mover_private_update_own on public.mover_private for update to authenticated
  using (mover_id = auth.uid()) with check (mover_id = auth.uid());

create policy jobs_read on public.jobs for select to authenticated using (
  company_id = public.my_company_id()
  or (public.is_mover() and status = 'open' and work_date >= public.app_today())
  or public.mover_involved_in_job(id)
);

create policy job_requests_read on public.job_requests for select to authenticated using (
  mover_id = auth.uid()
  or exists (select 1 from public.jobs j where j.id = job_id and j.company_id = public.my_company_id())
);

create policy bookings_read on public.bookings for select to authenticated using (
  mover_id = auth.uid()
  or exists (select 1 from public.jobs j where j.id = job_id and j.company_id = public.my_company_id())
);

create policy standby_read on public.standby for select to authenticated using (
  mover_id = auth.uid()
  or exists (select 1 from public.jobs j where j.id = job_id and j.company_id = public.my_company_id())
);

create policy hires_read on public.hires for select to authenticated
  using (mover_id = auth.uid() or company_id = public.my_company_id());

-- The core rule: company reviews are shared among verified companies and shown to the reviewed mover.
-- A review LiftCrew staff removed after a dispute disappears for everyone, including from stats.
create policy reviews_read on public.reviews for select to authenticated
  using ((mover_id = auth.uid() or public.is_company()) and not public.review_removed(id));
create policy review_responses_read on public.review_responses for select to authenticated using (
  exists (select 1 from public.reviews r where r.id = review_id and (r.mover_id = auth.uid() or public.is_company()))
  and not public.review_removed(review_id)
);
create policy review_disputes_read on public.review_disputes for select to authenticated using (
  exists (select 1 from public.reviews r where r.id = review_id and (r.mover_id = auth.uid() or public.is_company()))
  and status <> 'removed'
);

-- ---------------------------------------------------------------------------
-- Privileges: read-only tables for clients; writes only through the functions below.
-- (Supabase grants ALL on new tables to anon/authenticated by default, so revoke first.)
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
grant select (id, name, city, verified, job_prefix, payroll_portal_name, payroll_portal_url, created_at)
  on public.companies to authenticated;     -- owner_id, permit and insurance only via my_company()
grant select on public.profiles, public.movers, public.mover_private, public.jobs,
  public.job_requests, public.bookings, public.standby, public.hires, public.reviews,
  public.review_responses, public.review_disputes to authenticated;
-- Name, permit and insurance changes go through LiftCrew staff, who re-verify them.
grant update (city, payroll_portal_name, payroll_portal_url) on public.companies to authenticated;
grant update (full_name, city, roles, license, years_experience, asking_rate, bio, available_days, updated_at)
  on public.movers to authenticated;
grant update (phone) on public.mover_private to authenticated;

-- ---------------------------------------------------------------------------
-- Sign-up: every auth user gets a profile with the account type chosen at sign-up.
-- ---------------------------------------------------------------------------
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare t text := new.raw_user_meta_data ->> 'account_type';
begin
  if t is null or t not in ('company', 'mover') then
    raise exception 'Choose whether this is a moving company or a mover account.';
  end if;
  insert into public.profiles (id, account_type) values (new.id, t::public.account_type);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_mover() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger movers_touch before update on public.movers for each row execute function public.touch_mover();

-- The caller's own company, all columns (verified or not).
create function public.my_company() returns setof public.companies
language sql stable security definer set search_path = '' as $$
  select * from public.companies where owner_id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- RPCs: onboarding
-- ---------------------------------------------------------------------------
create function public.create_company(
  p_name text, p_city text, p_permit_number text, p_insurance_expires date, p_job_prefix text
) returns public.companies
language plpgsql security definer set search_path = '' as $$
declare c public.companies;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.account_type = 'company') then
    raise exception 'Only moving company accounts can create a company.';
  end if;
  insert into public.companies (owner_id, name, city, permit_number, insurance_expires, job_prefix)
  values (auth.uid(), public.clean_text(p_name, 120), public.clean_text(p_city, 80),
          upper(btrim(p_permit_number)), p_insurance_expires, upper(btrim(p_job_prefix)))
  returning * into c;
  return c;
exception when unique_violation then
  raise exception 'This account already has a company.';
end $$;

create function public.create_mover_profile(
  p_full_name text, p_city text, p_roles public.work_role[], p_license public.license_class,
  p_years int, p_asking_rate numeric, p_bio text, p_available_days text[], p_phone text
) returns public.movers
language plpgsql security definer set search_path = '' as $$
declare m public.movers;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.account_type = 'mover') then
    raise exception 'Only mover accounts can create a mover profile.';
  end if;
  insert into public.movers (id, full_name, city, roles, license, years_experience, asking_rate, bio, available_days)
  values (auth.uid(), public.clean_text(p_full_name, 80), public.clean_text(p_city, 80), p_roles, p_license,
          coalesce(p_years, 0), p_asking_rate, public.clean_text(p_bio, 600), coalesce(p_available_days, '{}'))
  returning * into m;
  insert into public.mover_private (mover_id, phone) values (auth.uid(), btrim(p_phone));
  return m;
exception when unique_violation then
  raise exception 'This account already has a mover profile.';
end $$;

-- ---------------------------------------------------------------------------
-- RPCs: jobs and booking (company side)
-- ---------------------------------------------------------------------------
create function public.require_company() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare cid uuid := public.my_company_id();
begin
  if cid is null then
    raise exception 'Your company needs to be verified (Cal-T permit and insurance) before you can do this.'
      using errcode = '42501';
  end if;
  return cid;
end $$;

-- Locks the job row (FOR UPDATE) so concurrent changes to the same job run one at a time.
-- Lock order everywhere: job first, then its bookings/standby rows.
create function public.require_own_job(p_job uuid) returns public.jobs
language plpgsql security definer set search_path = '' as $$
declare j public.jobs;
begin
  select * into j from public.jobs where id = p_job and company_id = public.require_company() for update;
  if not found then raise exception 'Job not found.' using errcode = '42501'; end if;
  return j;
end $$;

create function public.lock_job(p_job uuid) returns public.jobs
language plpgsql security definer set search_path = '' as $$
declare j public.jobs;
begin
  select * into j from public.jobs where id = p_job for update;
  if not found then raise exception 'Job not found.'; end if;
  return j;
end $$;

create function public.job_started(p_job uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select now() >= public.job_starts_at(p_job)
$$;

create function public.post_job(
  p_work_date date, p_start_time time, p_est_hours numeric, p_route text, p_description text,
  p_crew_size int, p_role public.work_role, p_hourly_rate numeric, p_truck text
) returns public.jobs
language plpgsql security definer set search_path = '' as $$
declare cid uuid := public.require_company(); seq int; pre text; j public.jobs;
begin
  if p_work_date < public.app_today() then raise exception 'Pick today or a future date.'; end if;
  update public.companies set next_job_seq = next_job_seq + 1 where id = cid
    returning next_job_seq - 1, job_prefix into seq, pre;
  insert into public.jobs (company_id, job_number, work_date, start_time, est_hours, route, description,
                           crew_size, role, hourly_rate, truck)
  values (cid, pre || '-' || seq, p_work_date, p_start_time, p_est_hours, public.clean_text(p_route, 120),
          public.clean_text(p_description, 240), p_crew_size, p_role, p_hourly_rate,
          coalesce(public.clean_text(p_truck, 60), 'No truck (labor only)'))
  returning * into j;
  return j;
end $$;

create function public.ensure_hire(p_company uuid, p_mover uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.hires (company_id, mover_id) values (p_company, p_mover) on conflict do nothing
$$;

create function public.check_bookable(j public.jobs, p_mover uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
declare m public.movers;
begin
  if j.status <> 'open' or j.work_date < public.app_today() then raise exception 'This job is no longer open.'; end if;
  if public.open_spots(j.id) < 1 then raise exception 'This job''s crew is already full.'; end if;
  select * into m from public.movers where id = p_mover;
  if not found then raise exception 'Mover not found.'; end if;
  if not m.id_verified then raise exception 'This mover hasn''t finished ID verification yet.'; end if;
  if m.background = 'not_clear' then raise exception 'This mover can''t be booked right now.'; end if;
  if exists (select 1 from public.bookings b where b.job_id = j.id and b.mover_id = p_mover
             and b.status in ('pending','confirmed','completed')) then
    raise exception 'This mover is already on this job.';
  end if;
end $$;

-- Invite a mover; they must accept.
create function public.invite_mover(p_job uuid, p_mover uuid) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare j public.jobs := public.require_own_job(p_job); b public.bookings;
begin
  perform public.check_bookable(j, p_mover);
  update public.standby set status = 'withdrawn' where job_id = p_job and mover_id = p_mover and status in ('offered','accepted');
  insert into public.bookings (job_id, mover_id, status, hourly_rate, est_hours)
  values (p_job, p_mover, 'pending', j.hourly_rate, j.est_hours) returning * into b;
  delete from public.job_requests where job_id = p_job and mover_id = p_mover;
  perform public.ensure_hire(j.company_id, p_mover);
  return b;
end $$;

-- Book a mover who requested the job; confirmed right away.
create function public.book_requester(p_job uuid, p_mover uuid) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare j public.jobs := public.require_own_job(p_job); b public.bookings;
begin
  if not exists (select 1 from public.job_requests where job_id = p_job and mover_id = p_mover) then
    raise exception 'This mover hasn''t requested this job.';
  end if;
  perform public.check_bookable(j, p_mover);
  update public.standby set status = 'withdrawn' where job_id = p_job and mover_id = p_mover and status in ('offered','accepted');
  insert into public.bookings (job_id, mover_id, status, hourly_rate, est_hours, responded_at)
  values (p_job, p_mover, 'confirmed', j.hourly_rate, j.est_hours, now()) returning * into b;
  delete from public.job_requests where job_id = p_job and mover_id = p_mover;
  perform public.ensure_hire(j.company_id, p_mover);
  return b;
end $$;

-- Company takes back an invitation or booking before the job.
create function public.withdraw_booking(p_booking uuid) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare b public.bookings; j public.jobs;
begin
  select * into b from public.bookings where id = p_booking;
  if not found then raise exception 'Booking not found.'; end if;
  j := public.require_own_job(b.job_id);
  select * into b from public.bookings where id = p_booking for update;
  if b.status not in ('pending','confirmed') or j.status <> 'open' then raise exception 'This booking can''t be withdrawn.'; end if;
  if public.job_started(j.id) then
    raise exception 'The job has started. Mark the job complete and enter 0 hours for anyone who didn''t work.';
  end if;
  update public.bookings set status = 'withdrawn', canceled_at = now(), pay_status = 'none'
    where id = p_booking returning * into b;
  return b;
end $$;

create function public.set_hire_status(p_mover uuid, p_status public.hire_status) returns public.hires
language plpgsql security definer set search_path = '' as $$
declare cid uuid := public.require_company(); h public.hires;
begin
  update public.hires set status = p_status, updated_at = now()
    where company_id = cid and mover_id = p_mover returning * into h;
  if not found then raise exception 'Book this mover first.'; end if;
  return h;
end $$;

create function public.offer_standby(p_job uuid, p_mover uuid) returns public.standby
language plpgsql security definer set search_path = '' as $$
declare j public.jobs := public.require_own_job(p_job); s public.standby; m public.movers;
begin
  if j.status <> 'open' or j.work_date < public.app_today() then raise exception 'This job is no longer open.'; end if;
  if (select count(*) from public.standby where job_id = p_job and status in ('offered','accepted'))
     >= public.max_standby_per_job() then
    raise exception 'A job can have at most % standby movers.', public.max_standby_per_job();
  end if;
  select * into m from public.movers where id = p_mover;
  if not found or not m.id_verified or m.background = 'not_clear' then raise exception 'This mover can''t be offered standby.'; end if;
  if exists (select 1 from public.bookings where job_id = p_job and mover_id = p_mover and status in ('pending','confirmed')) then
    raise exception 'This mover is already on the crew.';
  end if;
  insert into public.standby (job_id, mover_id) values (p_job, p_mover) returning * into s;
  return s;
exception when unique_violation then
  raise exception 'This mover already has a standby offer for this job.';
end $$;

create function public.withdraw_standby(p_standby uuid) returns public.standby
language plpgsql security definer set search_path = '' as $$
declare s public.standby;
begin
  select * into s from public.standby where id = p_standby;
  if not found then raise exception 'Standby offer not found.'; end if;
  perform public.require_own_job(s.job_id);
  select * into s from public.standby where id = p_standby for update;
  if s.status not in ('offered','accepted') then raise exception 'This standby offer is already closed.'; end if;
  update public.standby set status = 'withdrawn' where id = p_standby returning * into s;
  return s;
end $$;

-- Wrap up a job: record hours and tips per mover; LiftCrew moves no money.
-- p_entries: [{"booking_id": "...", "hours": 6.5, "tip": 40}]
create function public.complete_job(p_job uuid, p_entries jsonb, p_already_paid boolean default false)
returns public.jobs
language plpgsql security definer set search_path = '' as $$
declare j public.jobs := public.require_own_job(p_job); b record; e jsonb; hrs numeric; tp numeric;
begin
  if j.status <> 'open' then raise exception 'This job is already closed.'; end if;
  if j.work_date > public.app_today() then raise exception 'You can complete a job on or after its date.'; end if;
  for b in select * from public.bookings where job_id = p_job and status = 'confirmed' loop
    select x into e from jsonb_array_elements(coalesce(p_entries, '[]'::jsonb)) x
      where x ->> 'booking_id' = b.id::text limit 1;
    if e is null then raise exception 'Enter hours for every mover on the crew.'; end if;
    hrs := (e ->> 'hours')::numeric;
    tp := coalesce((e ->> 'tip')::numeric, 0);
    if hrs is null or hrs < 0 or hrs > 24 then raise exception 'Hours must be between 0 and 24.'; end if;
    if tp < 0 or tp > 10000 then raise exception 'Tips must be between $0 and $10,000.'; end if;
    update public.bookings set
      status = 'completed', hours_worked = hrs, wages = round(hrs * b.hourly_rate, 2), tip = round(tp, 2),
      pay_status = case when hrs = 0 and tp = 0 then 'none'::public.pay_status
                        when p_already_paid then 'paid'::public.pay_status else 'due'::public.pay_status end,
      paid_at = case when p_already_paid and (hrs > 0 or tp > 0) then now() end
    where id = b.id;
  end loop;
  update public.bookings set status = 'declined', pay_status = 'none' where job_id = p_job and status = 'pending';
  update public.standby set status = 'held', standby_pay = public.standby_pay_amount(),
    pay_status = case when p_already_paid then 'paid'::public.pay_status else 'due'::public.pay_status end,
    paid_at = case when p_already_paid then now() end
    where job_id = p_job and status = 'accepted';
  update public.standby set status = 'withdrawn' where job_id = p_job and status = 'offered';
  delete from public.job_requests where job_id = p_job;
  update public.jobs set status = 'completed', completed_at = now() where id = p_job returning * into j;
  return j;
end $$;

create function public.cancel_job(p_job uuid) returns public.jobs
language plpgsql security definer set search_path = '' as $$
declare j public.jobs := public.require_own_job(p_job);
begin
  if j.status <> 'open' then raise exception 'This job is already closed.'; end if;
  if public.job_started(j.id) and exists (select 1 from public.bookings where job_id = p_job and status = 'confirmed') then
    raise exception 'The job has started. Mark the job complete and enter 0 hours for anyone who didn''t work.';
  end if;
  update public.bookings set status = 'withdrawn', canceled_at = now(), pay_status = 'none'
    where job_id = p_job and status in ('pending','confirmed');
  update public.standby set status = 'withdrawn' where job_id = p_job and status in ('offered','accepted');
  delete from public.job_requests where job_id = p_job;
  update public.jobs set status = 'canceled' where id = p_job returning * into j;
  return j;
end $$;

create function public.mark_paid(p_booking uuid) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = p_booking for update;
  if not found then raise exception 'Booking not found.'; end if;
  perform public.require_own_job(b.job_id);
  if b.pay_status <> 'due' then raise exception 'Nothing is due on this booking.'; end if;
  update public.bookings set pay_status = 'paid', paid_at = now() where id = p_booking returning * into b;
  return b;
end $$;

create function public.mark_standby_paid(p_standby uuid) returns public.standby
language plpgsql security definer set search_path = '' as $$
declare s public.standby;
begin
  select * into s from public.standby where id = p_standby for update;
  if not found then raise exception 'Standby record not found.'; end if;
  perform public.require_own_job(s.job_id);
  if s.pay_status <> 'due' then raise exception 'Nothing is due on this standby.'; end if;
  update public.standby set pay_status = 'paid', paid_at = now() where id = p_standby returning * into s;
  return s;
end $$;

create function public.record_tip(p_booking uuid, p_tip numeric) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = p_booking for update;
  if not found then raise exception 'Booking not found.'; end if;
  perform public.require_own_job(b.job_id);
  if b.status <> 'completed' then raise exception 'You can add a tip after the job is complete.'; end if;
  if p_tip is null or p_tip <= 0 or p_tip > 10000 then raise exception 'Enter a tip between $0.01 and $10,000.'; end if;
  update public.bookings set tip = round(b.tip + p_tip, 2), pay_status = 'due', paid_at = null
    where id = p_booking returning * into b;
  return b;
end $$;

create function public.submit_review(
  p_booking uuid, p_showed boolean, p_on_time boolean, p_rebook boolean, p_strengths text[], p_note text
) returns public.reviews
language plpgsql security definer set search_path = '' as $$
declare b public.bookings; j public.jobs; r public.reviews;
begin
  select * into b from public.bookings where id = p_booking;
  if not found then raise exception 'Booking not found.'; end if;
  j := public.require_own_job(b.job_id);
  if b.status <> 'completed' then raise exception 'You can review a mover after the job is complete.'; end if;
  insert into public.reviews (booking_id, job_id, company_id, mover_id, showed, on_time, rebook, strengths, note)
  values (b.id, j.id, j.company_id, b.mover_id, p_showed, p_showed and p_on_time, p_rebook,
          coalesce(p_strengths, '{}'), public.clean_text(p_note, 280))
  returning * into r;
  return r;
exception when unique_violation then
  raise exception 'You''ve already reviewed this mover for this job.';
end $$;

-- ---------------------------------------------------------------------------
-- RPCs: mover side
-- ---------------------------------------------------------------------------
create function public.require_mover() returns public.movers
language plpgsql stable security definer set search_path = '' as $$
declare m public.movers;
begin
  select * into m from public.movers where id = auth.uid();
  if not found then raise exception 'Finish your mover profile first.' using errcode = '42501'; end if;
  return m;
end $$;

create function public.request_job(p_job uuid) returns public.job_requests
language plpgsql security definer set search_path = '' as $$
declare m public.movers := public.require_mover(); j public.jobs; r public.job_requests;
begin
  select * into j from public.jobs where id = p_job;
  if not found or j.status <> 'open' or j.work_date < public.app_today() then raise exception 'This job is no longer open.'; end if;
  if public.open_spots(p_job) < 1 then raise exception 'This job''s crew is already full.'; end if;
  if exists (select 1 from public.bookings where job_id = p_job and mover_id = m.id and status in ('pending','confirmed','completed')) then
    raise exception 'You''re already on this job.';
  end if;
  insert into public.job_requests (job_id, mover_id) values (p_job, m.id) returning * into r;
  return r;
exception when unique_violation then
  raise exception 'You already requested this job.';
end $$;

create function public.withdraw_request(p_job uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_mover();
  delete from public.job_requests where job_id = p_job and mover_id = auth.uid();
end $$;

create function public.respond_booking(p_booking uuid, p_accept boolean) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare b public.bookings; j public.jobs;
begin
  perform public.require_mover();
  select * into b from public.bookings where id = p_booking and mover_id = auth.uid();
  if not found then raise exception 'Invitation not found.'; end if;
  j := public.lock_job(b.job_id);
  select * into b from public.bookings where id = p_booking for update;
  if b.status <> 'pending' then raise exception 'This invitation was already answered.'; end if;
  if p_accept and (j.status <> 'open' or j.work_date < public.app_today()) then raise exception 'This job is no longer open.'; end if;
  update public.bookings set status = case when p_accept then 'confirmed'::public.booking_status else 'declined'::public.booking_status end,
    responded_at = now(), pay_status = case when p_accept then 'upcoming'::public.pay_status else 'none'::public.pay_status end
    where id = p_booking returning * into b;
  return b;
end $$;

-- Mover cancels a confirmed booking. Late if within 48 hours of start. The first standby mover who
-- accepted moves into the spot automatically.
create function public.cancel_booking(p_booking uuid, p_reason public.cancel_reason) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare b public.bookings; j public.jobs; s public.standby; nb public.bookings;
begin
  perform public.require_mover();
  select * into b from public.bookings where id = p_booking and mover_id = auth.uid();
  if not found then raise exception 'Booking not found.'; end if;
  j := public.lock_job(b.job_id);
  select * into b from public.bookings where id = p_booking for update;
  if b.status <> 'confirmed' then raise exception 'Only confirmed bookings can be canceled.'; end if;
  if j.status <> 'open' then raise exception 'This job is already closed.'; end if;
  if public.job_started(j.id) then
    raise exception 'This job has already started. Call the company instead.';
  end if;
  update public.bookings set status = 'canceled', canceled_at = now(), cancel_reason = coalesce(p_reason, 'Other'),
    late_cancel = (public.job_starts_at(j.id) - now()) < public.late_cancel_window(), pay_status = 'none'
    where id = p_booking returning * into b;
  select * into s from public.standby where job_id = j.id and status = 'accepted'
    order by responded_at nulls last, created_at limit 1 for update;
  if found then
    update public.standby set status = 'promoted' where id = s.id;
    insert into public.bookings (job_id, mover_id, status, hourly_rate, est_hours, responded_at, from_standby)
    values (j.id, s.mover_id, 'confirmed', j.hourly_rate, j.est_hours, now(), true) returning * into nb;
    perform public.ensure_hire(j.company_id, s.mover_id);
    update public.bookings set replaced_by_booking = nb.id where id = b.id returning * into b;
  end if;
  return b;
end $$;

create function public.respond_standby(p_standby uuid, p_accept boolean) returns public.standby
language plpgsql security definer set search_path = '' as $$
declare s public.standby; j public.jobs;
begin
  perform public.require_mover();
  select * into s from public.standby where id = p_standby and mover_id = auth.uid();
  if not found then raise exception 'Standby offer not found.'; end if;
  j := public.lock_job(s.job_id);
  select * into s from public.standby where id = p_standby for update;
  if p_accept then
    if s.status <> 'offered' then raise exception 'This standby offer was already answered.'; end if;
    if j.status <> 'open' or j.work_date < public.app_today() then raise exception 'This job is no longer open.'; end if;
    update public.standby set status = 'accepted', responded_at = now() where id = p_standby returning * into s;
  else
    if s.status not in ('offered','accepted') then raise exception 'This standby offer is already closed.'; end if;
    update public.standby set status = 'declined', responded_at = now() where id = p_standby returning * into s;
  end if;
  return s;
end $$;

create function public.respond_to_review(p_review uuid, p_body text) returns public.review_responses
language plpgsql security definer set search_path = '' as $$
declare r public.review_responses;
begin
  if not exists (select 1 from public.reviews where id = p_review and mover_id = auth.uid()) then
    raise exception 'Review not found.';
  end if;
  insert into public.review_responses (review_id, body) values (p_review, public.clean_text(p_body, 280)) returning * into r;
  return r;
exception when unique_violation then
  raise exception 'You''ve already responded to this review.';
end $$;

create function public.dispute_review(p_review uuid, p_reason text) returns public.review_disputes
language plpgsql security definer set search_path = '' as $$
declare d public.review_disputes;
begin
  if not exists (select 1 from public.reviews where id = p_review and mover_id = auth.uid()) then
    raise exception 'Review not found.';
  end if;
  insert into public.review_disputes (review_id, reason) values (p_review, public.clean_text(p_reason, 500)) returning * into d;
  return d;
exception when unique_violation then
  raise exception 'You''ve already disputed this review.';
end $$;

-- ---------------------------------------------------------------------------
-- Read helpers
-- ---------------------------------------------------------------------------
-- Aggregate track record across all companies. Only counts leave the function, never another
-- company's booking rows. Callable by verified companies, or by a mover for their own id.
create function public.mover_stats(p_movers uuid[])
returns table (mover_id uuid, jobs_completed int, reviews int, on_time_pct int, rebook_pct int, no_shows int, late_cancels int)
language sql stable security definer set search_path = '' as $$
  select m.id,
    (select count(*)::int from public.bookings b where b.mover_id = m.id and b.status = 'completed' and b.hours_worked > 0),
    (select count(*)::int from public.reviews r where r.mover_id = m.id and not public.review_removed(r.id)),
    (select case when count(*) filter (where r.showed) = 0 then null
            else round(100.0 * count(*) filter (where r.on_time) / count(*) filter (where r.showed))::int end
       from public.reviews r where r.mover_id = m.id and not public.review_removed(r.id)),
    (select case when count(*) = 0 then null else round(100.0 * count(*) filter (where r.rebook) / count(*))::int end
       from public.reviews r where r.mover_id = m.id and not public.review_removed(r.id)),
    (select count(*)::int from public.reviews r where r.mover_id = m.id and not public.review_removed(r.id) and not r.showed),
    (select count(*)::int from public.bookings b where b.mover_id = m.id and b.status = 'canceled' and b.late_cancel)
  from public.movers m
  where m.id = any (p_movers)
    and (public.is_company() or m.id = auth.uid())
$$;

-- Monthly booking fees for the caller's company (the only thing LiftCrew charges for).
create function public.my_booking_fees(p_month date default null)
returns table (month date, bookings int, fee_each numeric, total numeric)
language sql stable security definer set search_path = '' as $$
  select date_trunc('month', b.created_at at time zone public.app_timezone())::date,
         count(*)::int, public.booking_fee_amount(), count(*) * public.booking_fee_amount()
  from public.bookings b join public.jobs j on j.id = b.job_id
  where j.company_id = public.my_company_id()
    and b.status in ('confirmed','completed','canceled')       -- every booking a mover accepted
    and (p_month is null or date_trunc('month', b.created_at at time zone public.app_timezone())::date = date_trunc('month', p_month)::date)
  group by 1 order by 1 desc
$$;

-- ---------------------------------------------------------------------------
-- Function privileges: nothing for anon; RPCs for signed-in users only.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
grant execute on function
  public.create_company(text, text, text, date, text),
  public.create_mover_profile(text, text, public.work_role[], public.license_class, int, numeric, text, text[], text),
  public.post_job(date, time, numeric, text, text, int, public.work_role, numeric, text),
  public.invite_mover(uuid, uuid), public.book_requester(uuid, uuid), public.withdraw_booking(uuid),
  public.set_hire_status(uuid, public.hire_status), public.offer_standby(uuid, uuid), public.withdraw_standby(uuid),
  public.complete_job(uuid, jsonb, boolean), public.cancel_job(uuid), public.mark_paid(uuid),
  public.mark_standby_paid(uuid), public.record_tip(uuid, numeric),
  public.submit_review(uuid, boolean, boolean, boolean, text[], text),
  public.request_job(uuid), public.withdraw_request(uuid), public.respond_booking(uuid, boolean),
  public.cancel_booking(uuid, public.cancel_reason), public.respond_standby(uuid, boolean),
  public.respond_to_review(uuid, text), public.dispute_review(uuid, text),
  public.mover_stats(uuid[]), public.my_booking_fees(date), public.open_spots(uuid), public.my_company(),
  public.contains_sensitive_number(text), public.app_today(), public.app_timezone(),
  -- used inside RLS policies, so the calling role needs execute. They return only booleans about the caller:
  public.my_company_id(), public.is_company(), public.is_mover(), public.company_can_contact(uuid),
  public.mover_involved_in_job(uuid), public.review_removed(uuid)
to authenticated;
