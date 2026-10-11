import {
  todayISO,
  toNum,
  type Booking,
  type HireStatus,
  type Job,
  type MoverStats,
  type Review,
  type ReviewDispute,
  type ReviewResponse,
  type Standby,
} from '@liftcrew/shared';
import { must } from './useLoad';
import { one, rpc, supabase } from './supabase';

/* ------------------------------------------------------------------ Jobs tab */

export type MyJobState =
  | { kind: 'none' }
  | { kind: 'requested' }
  | { kind: 'booking'; status: Booking['status'] }
  | { kind: 'standby'; status: Standby['status'] };

export interface OpenJob {
  job: Job;
  companyName: string;
  openSpots: number;
  mine: MyJobState;
}

const JOB_LIMIT = 100;

/**
 * Open jobs dated today or later that still need crew, plus where the mover stands on each.
 * Row-level security also returns closed jobs the mover was involved in, so filter explicitly.
 */
export async function loadOpenJobs(moverId: string): Promise<OpenJob[]> {
  const today = todayISO();
  const jobs = must(
    await supabase
      .from('jobs')
      .select('*, companies(name)')
      .eq('status', 'open')
      .gte('work_date', today)
      .order('work_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(JOB_LIMIT),
  ) as (Job & { companies: { name: string } | { name: string }[] | null })[];
  if (!jobs.length) return [];
  const ids = jobs.map((j) => j.id);

  const [requests, bookings, standby, spots] = await Promise.all([
    supabase.from('job_requests').select('job_id').eq('mover_id', moverId).in('job_id', ids),
    supabase
      .from('bookings')
      .select('job_id, status')
      .eq('mover_id', moverId)
      .in('job_id', ids)
      .in('status', ['pending', 'confirmed', 'completed']),
    supabase
      .from('standby')
      .select('job_id, status')
      .eq('mover_id', moverId)
      .in('job_id', ids)
      .in('status', ['offered', 'accepted']),
    // open_spots counts other movers' bookings, which a mover can't read directly.
    Promise.all(ids.map((id) => rpc<'open_spots', number | null>('open_spots', { p_job: id }))),
  ]);
  const requested = new Set((must(requests) as { job_id: string }[]).map((r) => r.job_id));
  const booked = new Map((must(bookings) as { job_id: string; status: Booking['status'] }[]).map((b) => [b.job_id, b.status]));
  const onStandby = new Map((must(standby) as { job_id: string; status: Standby['status'] }[]).map((s) => [s.job_id, s.status]));

  const out: OpenJob[] = [];
  jobs.forEach((row, i) => {
    const { companies, ...job } = row;
    const b = booked.get(job.id);
    const s = onStandby.get(job.id);
    const mine: MyJobState = b
      ? { kind: 'booking', status: b }
      : s
        ? { kind: 'standby', status: s }
        : requested.has(job.id)
          ? { kind: 'requested' }
          : { kind: 'none' };
    const openSpots = Math.max(0, spots[i] ?? 0);
    // Full jobs drop off the list unless the mover is already part of them.
    if (openSpots < 1 && mine.kind === 'none') return;
    out.push({ job: job as Job, companyName: one(companies)?.name ?? 'Moving company', openSpots, mine });
  });
  return out;
}

/* ------------------------------------------------------------------ Bookings tab */

type JobSummary = Pick<Job, 'id' | 'company_id' | 'job_number' | 'work_date' | 'start_time' | 'est_hours' | 'route' | 'hourly_rate' | 'status'>;

export interface BookingRow extends Booking {
  job: JobSummary;
  companyName: string;
}

export interface StandbyRow extends Standby {
  job: JobSummary;
  companyName: string;
}

export interface MyBookings {
  invitations: BookingRow[];
  standby: StandbyRow[];
  upcoming: BookingRow[];
  past: BookingRow[];
  heldStandby: StandbyRow[];
  hires: Record<string, HireStatus>;
  markedPaid: number;
}

const JOB_FIELDS = 'jobs(id, company_id, job_number, work_date, start_time, est_hours, route, hourly_rate, status, companies(name))';

type Embedded = { jobs: (JobSummary & { companies: unknown }) | (JobSummary & { companies: unknown })[] | null };

function flatten<T extends object>(row: T & Embedded): (T & { job: JobSummary; companyName: string }) | null {
  const { jobs, ...rest } = row;
  const j = one(jobs);
  if (!j) return null;
  const { companies, ...job } = j;
  const company = one(companies as { name: string } | { name: string }[] | null);
  return { ...(rest as unknown as T), job, companyName: company?.name ?? 'Moving company' };
}

const byDateAsc = (a: { job: JobSummary }, b: { job: JobSummary }) =>
  (a.job.work_date + a.job.start_time).localeCompare(b.job.work_date + b.job.start_time);
const byDateDesc = (a: { job: JobSummary }, b: { job: JobSummary }) => byDateAsc(b, a);

export async function loadMyBookings(moverId: string): Promise<MyBookings> {
  const today = todayISO();
  const [b, s, h] = await Promise.all([
    supabase
      .from('bookings')
      .select(`*, ${JOB_FIELDS}`)
      .eq('mover_id', moverId)
      .in('status', ['pending', 'confirmed', 'completed', 'canceled', 'withdrawn'])
      .order('created_at', { ascending: false })
      .limit(300),
    supabase
      .from('standby')
      .select(`*, ${JOB_FIELDS}`)
      .eq('mover_id', moverId)
      .in('status', ['offered', 'accepted', 'held'])
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('hires').select('company_id, status').eq('mover_id', moverId),
  ]);
  const bookings = (must(b) as (Booking & Embedded)[]).map((r) => flatten<Booking>(r)).filter((r): r is BookingRow => !!r);
  const standby = (must(s) as (Standby & Embedded)[]).map((r) => flatten<Standby>(r)).filter((r): r is StandbyRow => !!r);
  const hires: Record<string, HireStatus> = {};
  for (const row of must(h) as { company_id: string; status: HireStatus }[]) hires[row.company_id] = row.status;

  const answerable = (j: JobSummary) => j.status === 'open' && j.work_date >= today;

  const invitations = bookings.filter((x) => x.status === 'pending' && answerable(x.job)).sort(byDateAsc);
  const upcoming = bookings.filter((x) => x.status === 'confirmed' && x.job.status === 'open').sort(byDateAsc);
  const past = bookings
    .filter((x) => x.status === 'completed' || x.status === 'canceled' || x.status === 'withdrawn')
    .sort(byDateDesc);
  const openStandby = standby
    .filter((x) => (x.status === 'offered' || x.status === 'accepted') && answerable(x.job))
    .sort(byDateAsc);
  const heldStandby = standby.filter((x) => x.status === 'held').sort(byDateDesc);

  const markedPaid =
    past
      .filter((x) => x.status === 'completed' && x.pay_status === 'paid')
      .reduce((sum, x) => sum + toNum(x.wages) + toNum(x.tip), 0) +
    heldStandby.filter((x) => x.pay_status === 'paid').reduce((sum, x) => sum + toNum(x.standby_pay), 0);

  return { invitations, standby: openStandby, upcoming, past, heldStandby, hires, markedPaid };
}

/* ------------------------------------------------------------------ My record tab */

export interface ReviewRow extends Review {
  companyName: string;
  jobNumber: string | null;
  workDate: string | null;
  response: ReviewResponse | null;
  dispute: ReviewDispute | null;
}

export interface MyRecord {
  stats: MoverStats | null;
  reviews: ReviewRow[];
}

export async function loadMyRecord(moverId: string): Promise<MyRecord> {
  const [stats, reviews] = await Promise.all([
    rpc<'mover_stats', MoverStats[] | null>('mover_stats', { p_movers: [moverId] }),
    supabase
      .from('reviews')
      .select('*, companies(name), jobs(job_number, work_date), review_responses(*), review_disputes(*)')
      .eq('mover_id', moverId)
      .order('created_at', { ascending: false })
      .limit(200),
  ]);
  type Raw = Review & {
    companies: unknown;
    jobs: unknown;
    review_responses: ReviewResponse | ReviewResponse[] | null;
    review_disputes: ReviewDispute | ReviewDispute[] | null;
  };
  const rows = (must(reviews) as Raw[]).map(({ companies, jobs, review_responses, review_disputes, ...r }) => {
    const job = one(jobs as { job_number: string; work_date: string } | null);
    return {
      ...r,
      companyName: one(companies as { name: string } | null)?.name ?? 'Moving company',
      jobNumber: job?.job_number ?? null,
      workDate: job?.work_date ?? null,
      response: one(review_responses),
      dispute: one(review_disputes),
    };
  });
  return { stats: stats?.find((s) => s.mover_id === moverId) ?? null, reviews: rows };
}
