import type { PayRecordRow } from '@liftcrew/shared';
import type { PayLine } from './types';

/** Rows for buildExport(). Lines with nothing owed are left out. */
export function toPayRecordRows(lines: PayLine[]): PayRecordRow[] {
  return lines
    .filter((l) => l.pay === 'due' || l.pay === 'paid')
    .map((l): PayRecordRow => ({
      date: l.date,
      jobNumber: l.jobNumber,
      route: l.route,
      mover: l.mover,
      type: l.kind === 'standby' ? 'Standby' : 'Wages',
      hours: l.hours ?? 0,
      rate: l.rate,
      wages: l.wages,
      standby: l.standby,
      tip: l.tip,
      status: l.pay === 'paid' ? 'Paid' : 'Due',
    }));
}
