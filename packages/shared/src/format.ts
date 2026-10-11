import { TIMEZONE, WEEKDAYS } from './constants';
import type { Num, Weekday } from './types';

export const toNum = (v: Num | null | undefined): number => (v == null || v === '' ? 0 : Number(v));

export const money = (v: Num | null | undefined): string =>
  '$' + toNum(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "2026-10-17" -> "Sat, Oct 17" (date-only values are calendar dates, not instants). */
export function fmtDate(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

/** "08:00:00" -> "8:00 AM" */
export function fmtTime(t: string): string {
  const [hh, mm] = t.split(':').map(Number);
  const ap = hh >= 12 ? 'PM' : 'AM';
  return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${ap}`;
}

export function weekdayOf(isoDate: string): Weekday {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  const js = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay(); // 0 = Sun
  return WEEKDAYS[(js + 6) % 7];
}

/** Today's date in LiftCrew's timezone, as YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(now);
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((w) => w[0]!.toUpperCase()).slice(0, 2).join('');
export const firstName = (name: string) => name.split(/\s+/)[0] ?? name;

/** Turns a Supabase/Postgres error into the message the database wrote for people. */
export function friendlyError(err: unknown): string {
  const e = err as { message?: string; code?: string } | null;
  if (!e?.message) return 'Something went wrong. Try again.';
  if (e.code === '23514' && /contains_sensitive_number|check constraint/i.test(e.message)) {
    return "Remove the ID or account number. LiftCrew doesn't store Social Security, card or bank numbers.";
  }
  if (/JWT|not authenticated|permission denied/i.test(e.message)) return 'Your session ended. Sign in again.';
  return e.message;
}
