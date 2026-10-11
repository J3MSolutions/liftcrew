import { toNum } from '@liftcrew/shared';
import type { BookingFees } from '@liftcrew/shared';
import { createClient } from './supabase/server';
import type { PayBookingRow, PayLine, PayStandbyRow } from './types';

const JOB_COLS = 'id, job_number, work_date, route, company_id';

export async function getPayData(companyId: string): Promise<{ lines: PayLine[]; fees: BookingFees[] }> {
  const supabase = await createClient();
  const [bRes, sRes, fRes] = await Promise.all([
    supabase
      .from('bookings')
      .select(`*, jobs!bookings_job_id_fkey(${JOB_COLS}), movers!bookings_mover_id_fkey(full_name)`)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(2000),
    supabase
      .from('standby')
      .select(`*, jobs!standby_job_id_fkey(${JOB_COLS}), movers!standby_mover_id_fkey(full_name)`)
      .eq('status', 'held')
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase.rpc('my_booking_fees', {}),
  ]);
  const err = bRes.error ?? sRes.error ?? fRes.error;
  if (err) throw new Error(err.message);

  const lines: PayLine[] = [];
  for (const b of (bRes.data ?? []) as PayBookingRow[]) {
    if (!b.jobs || b.jobs.company_id !== companyId) continue;
    const wages = toNum(b.wages);
    const tip = toNum(b.tip);
    lines.push({
      key: 'b:' + b.id, kind: 'booking', id: b.id, jobNumber: b.jobs.job_number, date: b.jobs.work_date,
      route: b.jobs.route, mover: b.movers?.full_name ?? 'Mover', hours: toNum(b.hours_worked),
      rate: toNum(b.hourly_rate), wages, standby: 0, tip, total: wages + tip, pay: b.pay_status,
    });
  }
  for (const s of (sRes.data ?? []) as PayStandbyRow[]) {
    if (!s.jobs || s.jobs.company_id !== companyId) continue;
    const amount = toNum(s.standby_pay);
    lines.push({
      key: 's:' + s.id, kind: 'standby', id: s.id, jobNumber: s.jobs.job_number, date: s.jobs.work_date,
      route: s.jobs.route, mover: s.movers?.full_name ?? 'Mover', hours: null, rate: 0, wages: 0,
      standby: amount, tip: 0, total: amount, pay: s.pay_status,
    });
  }
  lines.sort((a, b) => b.date.localeCompare(a.date) || a.jobNumber.localeCompare(b.jobNumber) || a.mover.localeCompare(b.mover));

  return { lines, fees: (fRes.data ?? []) as BookingFees[] };
}
