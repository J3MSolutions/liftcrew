-- End-to-end checks of the privacy rules and booking logic, run as real database roles.
-- Run with supabase/tests/run_local.sh (plain Postgres) — any failed check stops the run.
\set ON_ERROR_STOP 1
set client_min_messages = notice;

create schema tests;
grant usage on schema tests to anon, authenticated;

create function tests.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAILED: %', label; end if;
  raise notice 'ok - %', label;
end $$;

-- Passes when the statement raises an error whose message matches the pattern.
create function tests.throws(stmt text, pattern text, label text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if sqlerrm ~* pattern then raise notice 'ok - %', label; return; end if;
    raise exception 'FAILED: % (wrong error: %)', label, sqlerrm;
  end;
  raise exception 'FAILED: % (no error raised)', label;
end $$;

create function tests.n(stmt text) returns int language plpgsql as $$
declare c int; begin execute 'select count(*) from (' || stmt || ') q' into c; return c; end $$;

create function tests.val(stmt text) returns text language plpgsql as $$
declare v text; begin execute stmt into v; return v; end $$;

grant execute on all functions in schema tests to anon, authenticated;

-- Switch identity: '' = superuser, 'anon', or a user id.
create function tests.login(who text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', case when who in ('', 'anon') then '' else who end, false);
  if who = '' then reset role;
  elsif who = 'anon' then set role anon;
  else set role authenticated; end if;
end $$;

-- Fixed ids
\set co1 '''10000000-0000-0000-0000-000000000001'''
\set co2 '''10000000-0000-0000-0000-000000000002'''
\set co3 '''10000000-0000-0000-0000-000000000003'''
\set mA  '''20000000-0000-0000-0000-00000000000a'''
\set mB  '''20000000-0000-0000-0000-00000000000b'''
\set mC  '''20000000-0000-0000-0000-00000000000c'''
\set mD  '''20000000-0000-0000-0000-00000000000d'''

-- ---------------------------------------------------------------- sign-up
select tests.throws($$insert into auth.users (id, raw_user_meta_data) values (gen_random_uuid(), '{}')$$,
  'Choose whether', 'sign-up without an account type is refused');
insert into auth.users (id, raw_user_meta_data) values
  (:co1, '{"account_type":"company"}'), (:co2, '{"account_type":"company"}'), (:co3, '{"account_type":"company"}'),
  (:mA, '{"account_type":"mover"}'), (:mB, '{"account_type":"mover"}'), (:mC, '{"account_type":"mover"}'),
  (:mD, '{"account_type":"mover"}');
select tests.ok(tests.n('select * from public.profiles') = 7, 'profiles created by trigger');

select tests.login(:co1);
select tests.ok((public.create_company('Redwood Valley Movers', 'Petaluma', 'MTR0190412', '2027-03-01', 'rv')).job_prefix = 'RV', 'company 1 created');
select tests.throws($$select public.create_company('Again', 'Petaluma', 'MTR0190412', '2027-03-01', 'RV')$$, 'already has a company', 'one company per account');
select tests.throws($$select public.create_mover_profile('X Y', 'Petaluma', '{Helper}', 'None', 1, 25, null, '{}', '707 555 0100')$$,
  'Only mover accounts', 'company account cannot become a mover');
select tests.login(:co2);
select public.create_company('Bayside Relocation', 'Santa Rosa', 'MTR0188730', '2027-01-01', 'BR');
select tests.login(:co3);
select public.create_company('Not Verified Yet Moving', 'Napa', 'MTR0000001', '2027-01-01', 'NV');

select tests.login(:mA);
select public.create_mover_profile('Marcus Reyes', 'Petaluma', '{Helper,Driver}', 'Class C', 6, 32, 'Six years with local crews.', '{Fri,Sat,Sun}', '(707) 555-0101');
select tests.throws($$select public.create_company('Sneaky Co', 'Petaluma', 'MTR9999999', '2027-01-01', 'SC')$$,
  'Only moving company accounts', 'mover cannot create a company to read reviews');
select tests.login(:mB);
select public.create_mover_profile('Dani Okafor', 'Santa Rosa', '{Helper,Packer}', 'None', 3, 28, null, '{Sat,Sun}', '(707) 555-0102');
select tests.login(:mC);
select public.create_mover_profile('Ray Delgado', 'Windsor', '{Helper}', 'Class C', 4, 30, null, '{Sat}', '(707) 555-0103');
select tests.login(:mD);
select tests.throws($$select public.create_mover_profile('Kevin Pham', 'Sonoma', '{Helper}', 'None', 1, 25, 'My SSN is 123-45-6789', '{}', '7075550104')$$,
  'Social Security', 'bio with an SSN is rejected');
select public.create_mover_profile('Kevin Pham', 'Sonoma', '{Helper}', 'None', 1, 25, null, '{Sat}', '(707) 555-0104');

-- Staff verification (service role / dashboard)
select tests.login('');
update public.companies set verified = true where owner_id in (:co1, :co2);
update public.movers set id_verified = true, background = 'clear' where id in (:mA, :mB, :mC);

-- ---------------------------------------------------------------- table access
select tests.login('anon');
select tests.throws('select * from public.movers', 'permission denied', 'anonymous visitors cannot read movers');
select tests.throws('select * from public.reviews', 'permission denied', 'anonymous visitors cannot read reviews');
select tests.throws($$select public.post_job(current_date, '08:00', 4, 'A to B', 'Test', 1, 'Helper', 30, 'Van')$$,
  'permission denied', 'anonymous visitors cannot call functions');

select tests.login(:co1);
select tests.throws($$insert into public.jobs (company_id, job_number, work_date, start_time, est_hours, route, description, crew_size, role, hourly_rate, truck)
  values (public.my_company_id(), 'X-1', current_date, '08:00', 4, 'A to B', 'x', 1, 'Helper', 30, 'Van')$$,
  'permission denied', 'companies cannot insert jobs directly');
select tests.throws($$update public.companies set verified = true$$, 'permission denied', 'companies cannot verify themselves');
select tests.throws($$update public.bookings set pay_status = 'paid'$$, 'permission denied', 'bookings cannot be edited directly');

-- ---------------------------------------------------------------- unverified company sees nothing
select tests.login(:co3);
select tests.throws($$select public.post_job(public.app_today() + 3, '08:00', 4, 'Napa to Sonoma', '1-bed apartment', 1, 'Helper', 30, 'Van')$$,
  'verified', 'unverified company cannot post jobs');
select tests.ok(tests.n('select * from public.movers') = 0, 'unverified company cannot browse movers');

-- ---------------------------------------------------------------- posting and booking
select tests.login(:co1);
create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated;
insert into ids select 'J1', id from public.post_job(public.app_today() + 1, '08:00', 6, 'Petaluma to Santa Rosa', '3-bed house', 2, 'Helper', 30, '26 ft box truck');
select tests.ok(tests.val($$select job_number from public.jobs where id = (select v from ids where k='J1')$$) = 'RV-1000', 'job numbered from company prefix');
select tests.throws($$select public.post_job(public.app_today() - 1, '08:00', 4, 'A to B', 'Past job', 1, 'Helper', 30, 'Van')$$,
  'future date', 'jobs cannot be posted in the past');
select tests.throws($$select public.post_job(public.app_today() + 1, '08:00', 4, 'A to B', 'Card 4111 1111 1111 1111', 1, 'Helper', 30, 'Van')$$,
  'card', 'job description with a card number is rejected');
select tests.ok(tests.n('select * from public.movers') = 4, 'verified company sees all movers');

select tests.login(:mA);
select tests.ok(tests.n($$select * from public.jobs where id = (select v from ids where k='J1')$$) = 1, 'movers see open jobs');
select tests.ok(tests.n('select * from public.movers') = 1, 'a mover sees only their own mover profile');
select tests.ok(tests.n('select * from public.mover_private') = 1, 'a mover sees only their own phone');
select public.request_job((select v from ids where k='J1'));

select tests.login(:co1);
select tests.ok(tests.n('select * from public.mover_private') = 0, 'company cannot see phones before booking');
select tests.throws($$select public.invite_mover((select v from ids where k='J1'), '20000000-0000-0000-0000-00000000000d')$$,
  'ID verification', 'cannot book a mover who is not ID verified');
insert into ids select 'BA', id from public.book_requester((select v from ids where k='J1'), :mA);
insert into ids select 'BB', id from public.invite_mover((select v from ids where k='J1'), :mB);
select tests.throws($$select public.invite_mover((select v from ids where k='J1'), '20000000-0000-0000-0000-00000000000c')$$,
  'already full', 'cannot overbook the crew');
select tests.ok(tests.n('select * from public.mover_private') = 1, 'company sees the phone of a confirmed mover, not of a pending invite');
select tests.ok(tests.val($$select status from public.hires where mover_id = '20000000-0000-0000-0000-00000000000a'$$) = 'needed', 'hiring paperwork tracked as needed');
select public.set_hire_status(:mA, 'sent');

select tests.login(:co2);
select tests.ok(tests.n('select * from public.mover_private') = 0, 'other companies cannot see those phones');
select tests.ok(tests.n('select * from public.bookings') = 0, 'other companies cannot see the bookings');
select tests.throws($$select public.invite_mover((select v from ids where k='J1'), '20000000-0000-0000-0000-00000000000c')$$,
  'Job not found', 'other companies cannot book onto the job');

select tests.login(:mB);
select tests.ok(tests.n('select * from public.mover_private') = 1, 'movers cannot see other movers phones');
select tests.ok(tests.n('select * from public.bookings') = 1, 'movers see only their own bookings');
select public.respond_booking((select v from ids where k='BB'), true);
select tests.login(:co1);
select tests.ok(tests.n('select * from public.mover_private') = 2, 'phone unlocks once the mover accepts');

-- ---------------------------------------------------------------- standby and cancellation
select tests.login(:co1);
insert into ids select 'SC', id from public.offer_standby((select v from ids where k='J1'), :mC);
select tests.throws($$select public.offer_standby((select v from ids where k='J1'), '20000000-0000-0000-0000-00000000000a')$$,
  'already on the crew', 'crew members cannot also be standby');
select tests.login(:mC);
select public.respond_standby((select v from ids where k='SC'), true);
select tests.ok(tests.n($$select * from public.jobs where id = (select v from ids where k='J1')$$) = 1, 'standby mover sees the job');

select tests.login(:mA);
select public.cancel_booking((select v from ids where k='BA'), 'Sick');
select tests.ok(tests.val($$select late_cancel::text from public.bookings where id = (select v from ids where k='BA')$$) = 'true',
  'cancel inside 48 hours is marked late');
select tests.ok(tests.val($$select status::text from public.bookings where id = (select v from ids where k='BA')$$) = 'canceled', 'booking canceled');

select tests.login(:co1);
select tests.ok(tests.n($$select * from public.bookings where job_id = (select v from ids where k='J1') and status = 'confirmed'$$) = 2,
  'standby mover moved into the spot, crew still full');
select tests.ok(tests.val($$select from_standby::text from public.bookings where mover_id = '20000000-0000-0000-0000-00000000000c'$$) = 'true', 'promoted booking flagged');
select tests.ok(tests.val($$select status::text from public.standby where id = (select v from ids where k='SC')$$) = 'promoted', 'standby marked promoted');
select tests.ok(tests.n($$select * from public.mover_private where mover_id = '20000000-0000-0000-0000-00000000000a'$$) = 0,
  'company loses access to a canceled mover''s phone');

-- ---------------------------------------------------------------- completing and pay records
select tests.throws($$select public.complete_job((select v from ids where k='J1'), '[]', false)$$,
  'on or after', 'cannot complete a job before its date');
select tests.login('');
update public.jobs set work_date = public.app_today() - 1 where id = (select v from ids where k='J1');
select tests.login(:co1);
select tests.throws($$select public.complete_job((select v from ids where k='J1'),
  jsonb_build_array(jsonb_build_object('booking_id', (select id from public.bookings where mover_id = '20000000-0000-0000-0000-00000000000b'), 'hours', 6)), false)$$,
  'every mover', 'hours required for every crew member');
select public.complete_job((select v from ids where k='J1'), (
  select jsonb_agg(jsonb_build_object('booking_id', id, 'hours', 6.5, 'tip', case when mover_id = '20000000-0000-0000-0000-00000000000b' then 40 else 0 end))
  from public.bookings where job_id = (select v from ids where k='J1') and status = 'confirmed'), false);
select tests.ok(tests.val($$select wages::text from public.bookings where mover_id = '20000000-0000-0000-0000-00000000000b' and status = 'completed'$$) = '195.00',
  'wages = hours x rate');
select tests.ok(tests.n($$select * from public.bookings where status = 'completed' and pay_status = 'due'$$) = 2, 'pay is due after completion');
select public.mark_paid((select id from public.bookings where mover_id = '20000000-0000-0000-0000-00000000000b' and status = 'completed'));
select tests.throws($$select public.mark_paid((select id from public.bookings where mover_id = '20000000-0000-0000-0000-00000000000b' and status = 'completed'))$$,
  'Nothing is due', 'cannot mark paid twice');
select public.record_tip((select id from public.bookings where mover_id = '20000000-0000-0000-0000-00000000000b' and status = 'completed'), 10);
select tests.ok(tests.val($$select tip::text || '/' || pay_status from public.bookings where mover_id = '20000000-0000-0000-0000-00000000000b' and status = 'completed'$$) = '50.00/due',
  'a later tip adds to the total and reopens pay');
select tests.ok((select bookings from public.my_booking_fees()) = 3, 'booking fees count every accepted booking');

-- ---------------------------------------------------------------- reviews: the core privacy rule
select tests.throws($$select public.submit_review((select id from public.bookings where mover_id = '20000000-0000-0000-0000-00000000000b' and status = 'completed'),
  true, true, true, '{}', 'Bank 0123456789012')$$, 'account number', 'review note with an account number is rejected');
insert into ids select 'RB', id from public.submit_review((select id from public.bookings where mover_id = '20000000-0000-0000-0000-00000000000b' and status = 'completed'),
  true, true, true, '{Fast packer}', 'Packed the kitchen fast.');
select tests.throws($$select public.submit_review((select id from public.bookings where mover_id = '20000000-0000-0000-0000-00000000000b' and status = 'completed'),
  true, true, true, '{}', null)$$, 'already reviewed', 'one review per booking');
select tests.throws($$select public.submit_review((select v from ids where k='BA'), false, false, false, '{}', null)$$,
  'after the job is complete', 'cannot review a canceled booking');

select tests.login(:co2);
select tests.ok(tests.n('select * from public.reviews') = 1, 'other verified companies can read the review');
select tests.throws($$select public.submit_review((select id from public.bookings limit 1), true, true, true, '{}', null)$$,
  'not found', 'other companies cannot review someone else''s booking');
select tests.ok((select reviews from public.mover_stats(array['20000000-0000-0000-0000-00000000000b'::uuid])) = 1, 'companies see a mover''s track record');

select tests.login(:co3);
select tests.ok(tests.n('select * from public.reviews') = 0, 'unverified company cannot read reviews');
select tests.ok(tests.n($$select * from public.mover_stats(array['20000000-0000-0000-0000-00000000000b'::uuid])$$) = 0, 'unverified company gets no stats');

select tests.login(:mB);
select tests.ok(tests.n('select * from public.reviews') = 1, 'a mover can read reviews about themselves');
select public.respond_to_review((select v from ids where k='RB'), 'Thanks!');
select public.dispute_review((select v from ids where k='RB'), 'Testing the dispute flow.');

select tests.login(:mA);
select tests.ok(tests.n('select * from public.reviews') = 0, 'movers cannot read reviews about other movers');
select tests.ok(tests.n('select * from public.review_responses') = 0, 'movers cannot read other movers'' review responses');
select tests.throws($$select public.respond_to_review((select id from public.reviews limit 1), 'hi')$$, 'not found', 'movers cannot respond to others'' reviews');
select tests.ok(tests.n($$select * from public.mover_stats(array['20000000-0000-0000-0000-00000000000b'::uuid])$$) = 0, 'movers cannot see other movers'' stats');
select tests.ok((select late_cancels from public.mover_stats(array['20000000-0000-0000-0000-00000000000a'::uuid])) = 1, 'a mover sees their own late cancellation');
select tests.ok(tests.n($$select * from public.jobs where id = (select v from ids where k='J1')$$) = 1, 'a mover still sees jobs they were on');

select tests.login(:mD);
select tests.ok(tests.n($$select * from public.jobs where id = (select v from ids where k='J1')$$) = 0, 'uninvolved movers do not see closed jobs');
select tests.ok(tests.n('select * from public.bookings') = 0, 'uninvolved movers see no bookings');

-- ---------------------------------------------------------------- nothing changes once a job has started
select tests.login(:co1);
insert into ids select 'J2', id from public.post_job(public.app_today() + 2, '08:00', 4, 'Cotati to Penngrove', 'Studio apartment', 1, 'Helper', 30, 'Cargo van');
insert into ids select 'B2', id from public.invite_mover((select v from ids where k='J2'), :mB);
select tests.login(:mB);
select public.respond_booking((select v from ids where k='B2'), true);
select tests.login('');
update public.jobs set work_date = public.app_today() - 1 where id = (select v from ids where k='J2');
select tests.login(:co1);
select tests.throws($$select public.withdraw_booking((select v from ids where k='B2'))$$, 'has started', 'company cannot erase a worked booking after the start');
select tests.throws($$select public.cancel_job((select v from ids where k='J2'))$$, 'has started', 'company cannot cancel a job after the crew started');
select tests.login(:mB);
select tests.throws($$select public.cancel_booking((select v from ids where k='B2'), 'Sick')$$, 'already started', 'mover cannot turn a no-show into a cancellation');

-- ---------------------------------------------------------------- internal functions are not callable
select tests.login(:mA);
select tests.throws($$select public.ensure_hire(public.my_company_id(), auth.uid())$$, 'permission denied', 'movers cannot forge hiring records');
select tests.throws($$select public.job_starts_at((select v from ids where k='J1'))$$, 'permission denied', 'internal job helpers are not callable');
select tests.throws($$select public.check_bookable(null::public.jobs, auth.uid())$$, 'permission denied', 'booking checks cannot be used to probe other movers');
select tests.login('');
select tests.ok((select string_agg(p.proname, ',' order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and has_function_privilege('authenticated', p.oid, 'execute')) =
  'app_timezone,app_today,book_requester,cancel_booking,cancel_job,company_can_contact,complete_job,contains_sensitive_number,create_company,create_mover_profile,dispute_review,invite_mover,is_company,is_mover,mark_paid,mark_standby_paid,mover_involved_in_job,mover_stats,my_booking_fees,my_company,my_company_id,offer_standby,open_spots,post_job,record_tip,request_job,respond_booking,respond_standby,respond_to_review,review_removed,set_hire_status,submit_review,withdraw_booking,withdraw_request,withdraw_standby',
  'signed-in users can execute only the intended functions');

-- ---------------------------------------------------------------- company details
select tests.login(:mA);
select tests.throws('select permit_number from public.companies', 'permission denied', 'movers cannot read permit numbers or owner ids');
select tests.ok(tests.n('select id, name, city from public.companies') = 2, 'movers see verified company names');
select tests.ok(tests.n('select * from public.my_company()') = 0, 'movers have no company');
select tests.login(:co3);
select tests.ok((select permit_number from public.my_company()) = 'MTR0000001', 'owners read their own full company record');
select tests.login(:co1);
select tests.throws($$update public.companies set name = 'Bayside Relocation' where id = public.my_company_id()$$, 'permission denied', 'companies cannot rename themselves without staff');
update public.companies set payroll_portal_name = 'Gusto', payroll_portal_url = 'https://app.gusto.com' where id = public.my_company_id();
select tests.ok((select payroll_portal_name from public.my_company()) = 'Gusto', 'companies can set their payroll portal');

-- ---------------------------------------------------------------- profile edits
select tests.login(:mA);
select tests.throws($$update public.movers set id_verified = true where id = auth.uid()$$, 'permission denied', 'movers cannot mark themselves ID verified');
select tests.throws($$update public.movers set background = 'clear' where id = auth.uid()$$, 'permission denied', 'movers cannot set their background result');
select tests.throws($$update public.movers set bio = 'Account 12345678901' where id = auth.uid()$$, 'check constraint', 'bio edits block account numbers');
select tests.throws($$update public.movers set full_name = 'Marcus 123-45-6789' where id = auth.uid()$$, 'check constraint', 'name edits block SSNs');
select tests.throws($$update public.movers set city = '4111111111111111' where id = auth.uid()$$, 'check constraint', 'city edits block card numbers');
select tests.throws($$update public.mover_private set phone = '123-45-6789' where mover_id = auth.uid()$$, '10-digit', 'an SSN cannot be saved as a phone');
update public.mover_private set phone = '+1 707.555.0199' where mover_id = auth.uid();
select tests.ok((select phone from public.mover_private where mover_id = auth.uid()) = '(707) 555-0199', 'phones are normalized');
update public.movers set bio = 'Updated bio' where id = '20000000-0000-0000-0000-00000000000b';
select tests.login('');
select tests.ok(tests.val($$select coalesce(bio, '') from public.movers where id = '20000000-0000-0000-0000-00000000000b'$$) <> 'Updated bio',
  'movers cannot edit other movers');

-- ---------------------------------------------------------------- removed reviews disappear
select tests.login('');
update public.review_disputes set status = 'removed', resolved_at = now() where review_id = (select v from ids where k='RB');
select tests.login(:co2);
select tests.ok(tests.n('select * from public.reviews') = 0, 'a removed review is hidden from companies');
select tests.ok((select reviews from public.mover_stats(array['20000000-0000-0000-0000-00000000000b'::uuid])) = 0, 'a removed review no longer counts in stats');
select tests.login(:mB);
select tests.ok(tests.n('select * from public.reviews') + tests.n('select * from public.review_responses') = 0, 'a removed review is hidden from the mover too');

-- ---------------------------------------------------------------- sensitive-number detector
select tests.ok(public.contains_sensitive_number('SSN 123.45.6789'), 'detects SSN with dots');
select tests.ok(public.contains_sensitive_number('ssn 123 456 789'), 'detects 3-3-3 grouping');
select tests.ok(public.contains_sensitive_number('SSN 123-45-6789'), 'detects SSN with dashes');
select tests.ok(public.contains_sensitive_number('123456789'), 'detects 9-digit run');
select tests.ok(public.contains_sensitive_number('4111 1111 1111 1111'), 'detects card number');
select tests.ok(not public.contains_sensitive_number('Call (707) 555-0148 after 5'), 'allows a phone number');
select tests.ok(not public.contains_sensitive_number('Moved 3 couches on 10/03/2026, 6.5 hrs'), 'allows ordinary text');

\echo ALL TESTS PASSED
