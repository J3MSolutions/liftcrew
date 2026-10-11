import { TIMEZONE } from '@liftcrew/shared';

/** Wall-clock parts of an instant in LiftCrew's timezone (California). */
function zonedParts(ms: number) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ms));
  const get = (k: string) => Number(parts.find((p) => p.type === k)?.value ?? 0);
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
}

/**
 * The instant a job starts: its calendar date and start time are California wall-clock time,
 * the same as job_starts_at() in the database.
 */
export function jobStartsAt(workDate: string, startTime: string): Date {
  const [y = 1970, mo = 1, d = 1] = workDate.slice(0, 10).split('-').map(Number);
  const [hh = 0, mm = 0] = startTime.split(':').map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, hh, mm);
  // Offset of California from UTC around that moment; a second pass settles DST edges.
  let guess = asUtc - (zonedParts(asUtc) - asUtc);
  guess = asUtc - (zonedParts(guess) - guess);
  return new Date(guess);
}

/** Hours from now until a job starts (negative once it has started). */
export function hoursUntilJob(workDate: string, startTime: string, now: Date = new Date()): number {
  return (jobStartsAt(workDate, startTime).getTime() - now.getTime()) / 3_600_000;
}
