import type { Hire, Mover, MoverStats, WorkRole, Weekday } from '@liftcrew/shared';
import { createClient } from './supabase/server';
import type { MoverCardData, ReviewWithExtras } from './types';

export interface MoverFilter {
  role: WorkRole | 'All';
  day: Weekday | 'Any';
  q: string;
}

async function statsFor(ids: string[]): Promise<Record<string, MoverStats>> {
  if (!ids.length) return {};
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('mover_stats', { p_movers: ids });
  if (error) throw new Error(error.message);
  const out: Record<string, MoverStats> = {};
  for (const s of (data ?? []) as MoverStats[]) out[s.mover_id] = s;
  return out;
}

/** Movers matching the Find movers filters, with track-record stats. */
export async function listMovers(f: MoverFilter): Promise<MoverCardData[]> {
  const supabase = await createClient();
  let query = supabase.from('movers').select('*').order('id_verified', { ascending: false }).order('full_name').limit(300);
  if (f.role !== 'All') query = query.contains('roles', [f.role]);
  if (f.day !== 'Any') query = query.contains('available_days', [f.day]);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const q = f.q.trim().toLowerCase();
  const movers = ((data ?? []) as Mover[]).filter(
    (m) => !q || `${m.full_name} ${m.city}`.toLowerCase().includes(q),
  );
  const stats = await statsFor(movers.map((m) => m.id));
  return movers.map((m) => ({ ...m, stats: stats[m.id] ?? null }));
}

export async function getHires(companyId: string): Promise<Record<string, Hire['status']>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('hires').select('mover_id, status').eq('company_id', companyId);
  if (error) throw new Error(error.message);
  const out: Record<string, Hire['status']> = {};
  for (const h of (data ?? []) as Pick<Hire, 'mover_id' | 'status'>[]) out[h.mover_id] = h.status;
  return out;
}

/** PostgREST returns one-to-one embeds as an object or a one-item array depending on version. */
function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export async function getMoverProfile(
  id: string,
): Promise<{ mover: MoverCardData; reviews: ReviewWithExtras[] } | null> {
  const supabase = await createClient();
  const { data: mover, error } = await supabase.from('movers').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!mover) return null;

  const [stats, reviewsRes] = await Promise.all([
    statsFor([id]),
    supabase
      .from('reviews')
      .select(
        `*, companies!reviews_company_id_fkey(name), jobs!reviews_job_id_fkey(job_number, work_date),
         review_responses(body, created_at), review_disputes(status)`,
      )
      .eq('mover_id', id)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  if (reviewsRes.error) throw new Error(reviewsRes.error.message);

  type Raw = ReviewWithExtras & {
    review_responses: unknown;
    review_disputes: unknown;
  };
  const reviews = ((reviewsRes.data ?? []) as Raw[])
    .map(({ review_responses, review_disputes, ...r }) => ({
      ...r,
      response: one(review_responses as ReviewWithExtras['response'] | ReviewWithExtras['response'][]),
      dispute: one(review_disputes as ReviewWithExtras['dispute'] | ReviewWithExtras['dispute'][]),
    }))
    // A review LiftCrew removed after a dispute is no longer shown.
    .filter((r) => r.dispute?.status !== 'removed');

  return { mover: { ...(mover as Mover), stats: stats[id] ?? null }, reviews };
}
