import type { Hire } from '@liftcrew/shared';
import { cache } from 'react';
import { createClient } from './supabase/server';
import type { JobBoard, JobBundle } from './types';

const MOVER_COLS = 'id, full_name, city, roles, available_days, id_verified, background';

// Explicit foreign-key hints keep PostgREST embeds unambiguous.
export const JOB_BUNDLE_SELECT = `*,
  bookings!bookings_job_id_fkey(*, movers!bookings_mover_id_fkey(${MOVER_COLS})),
  standby!standby_job_id_fkey(*, movers!standby_mover_id_fkey(${MOVER_COLS})),
  job_requests!job_requests_job_id_fkey(*, movers!job_requests_mover_id_fkey(${MOVER_COLS})),
  reviews!reviews_job_id_fkey(booking_id)`;

const COMPLETED_LIMIT = 30;

function normalize(rows: unknown[] | null): JobBundle[] {
  return ((rows ?? []) as JobBundle[]).map((j) => ({
    ...j,
    bookings: [...(j.bookings ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    standby: [...(j.standby ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    job_requests: [...(j.job_requests ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    reviews: j.reviews ?? [],
  }));
}

/** Everything the Jobs page and nav badges need. Cached per request. */
export const getJobBoard = cache(async (companyId: string): Promise<JobBoard> => {
  const supabase = await createClient();
  const [activeRes, doneRes, hiresRes] = await Promise.all([
    supabase.from('jobs').select(JOB_BUNDLE_SELECT).eq('company_id', companyId).eq('status', 'open')
      .order('work_date', { ascending: true }).order('start_time', { ascending: true }),
    supabase.from('jobs').select(JOB_BUNDLE_SELECT).eq('company_id', companyId).eq('status', 'completed')
      .order('work_date', { ascending: false }).limit(COMPLETED_LIMIT),
    supabase.from('hires').select('mover_id, status').eq('company_id', companyId),
  ]);
  const err = activeRes.error ?? doneRes.error ?? hiresRes.error;
  if (err) throw new Error(err.message);

  const active = normalize(activeRes.data);
  const completed = normalize(doneRes.data);

  const hires: JobBoard['hires'] = {};
  for (const h of (hiresRes.data ?? []) as Pick<Hire, 'mover_id' | 'status'>[]) hires[h.mover_id] = h.status;

  // Phone numbers: row-level security only returns them while a booking is current.
  const moverIds = [...new Set([...active, ...completed].flatMap((j) => j.bookings.map((b) => b.mover_id)))];
  const phones: JobBoard['phones'] = {};
  if (moverIds.length) {
    const { data } = await supabase.from('mover_private').select('mover_id, phone').in('mover_id', moverIds);
    for (const p of (data ?? []) as { mover_id: string; phone: string }[]) phones[p.mover_id] = p.phone;
  }

  return { active, completed, hires, phones };
});

/** Open jobs that still have room, for the "Book for" picker. */
export function bookableJobs(board: JobBoard, moverId: string, today: string): JobBundle[] {
  return board.active.filter(
    (j) =>
      j.work_date >= today &&
      j.crew_size - j.bookings.filter((b) => b.status === 'pending' || b.status === 'confirmed').length > 0 &&
      !j.bookings.some((b) => b.mover_id === moverId && ['pending', 'confirmed'].includes(b.status)),
  );
}

