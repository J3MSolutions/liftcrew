import type { Mover, Weekday } from '@liftcrew/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

export type StandbyCandidate = Pick<Mover, 'id' | 'full_name' | 'city' | 'roles' | 'available_days'>;

/** ID-verified movers who can be offered standby, free-that-weekday first. */
export async function loadStandbyCandidates(
  supabase: SupabaseClient,
  weekday: Weekday,
  exclude: Set<string>,
): Promise<StandbyCandidate[]> {
  const { data, error } = await supabase
    .from('movers')
    .select('id, full_name, city, roles, available_days')
    .eq('id_verified', true)
    .neq('background', 'not_clear')
    .order('full_name')
    .limit(300);
  if (error) throw error;
  return ((data ?? []) as StandbyCandidate[])
    .filter((m) => !exclude.has(m.id))
    .sort((a, b) => Number(b.available_days.includes(weekday)) - Number(a.available_days.includes(weekday)));
}
