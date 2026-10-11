// Pure helpers shared by server and client components.
import { toNum, todayISO, weekdayOf } from '@liftcrew/shared';
import type { Booking, HireStatus } from '@liftcrew/shared';
import type { JobBundle, MoverLite } from './types';

export const isActive = (b: Pick<Booking, 'status'>) => b.status === 'pending' || b.status === 'confirmed';

/** Same rule as public.open_spots(): crew size minus pending and confirmed bookings. */
export const openSpots = (j: JobBundle) => j.crew_size - j.bookings.filter(isActive).length;

export const isPast = (j: Pick<JobBundle, 'work_date'>, today = todayISO()) => j.work_date < today;
export const canComplete = (j: Pick<JobBundle, 'work_date' | 'status'>, today = todayISO()) =>
  j.status === 'open' && j.work_date <= today;

export const estWages = (b: Pick<Booking, 'hourly_rate' | 'est_hours'>) => toNum(b.hourly_rate) * toNum(b.est_hours);

export const hireOf = (hires: Record<string, HireStatus>, moverId: string): HireStatus => hires[moverId] ?? 'needed';

export const reviewedIds = (j: JobBundle) => new Set(j.reviews.map((r) => r.booking_id));

export const moverName = (m: MoverLite | null | undefined) => m?.full_name ?? 'Mover';

/** Jobs that need the company to do something (badge count on the Jobs nav item). */
export function needsAttention(j: JobBundle, hires: Record<string, HireStatus>, today = todayISO()): boolean {
  if (j.status === 'open') {
    if (isPast(j, today)) return true;
    if (j.job_requests.length > 0 && openSpots(j) > 0) return true;
    if (j.bookings.some((b) => isActive(b) && hireOf(hires, b.mover_id) !== 'done')) return true;
    return false;
  }
  if (j.status === 'completed') {
    const reviewed = reviewedIds(j);
    return j.bookings.some((b) => b.status === 'completed' && !reviewed.has(b.id));
  }
  return false;
}

/** Link to Find movers, pre-filtered for a job's role and weekday. */
export const findMoversHref = (j: Pick<JobBundle, 'id' | 'role' | 'work_date'>) =>
  `/movers?job=${encodeURIComponent(j.id)}&role=${encodeURIComponent(j.role)}&day=${weekdayOf(j.work_date)}`;
