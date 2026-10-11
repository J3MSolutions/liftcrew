import type { ReactNode } from 'react';
import { View } from 'react-native';
import { fmtDate, fmtTime, money, toNum, type Job } from '@liftcrew/shared';
import { hrs, perHour } from '../lib/format';
import { Facts, Row, T, Ticket } from './ui';

/** A job "ticket" as movers see it: company, job number, route, facts and estimated pay. */
export function JobTicket({
  job,
  companyName,
  status,
  note,
  footer,
}: {
  job: Job;
  companyName: string;
  /** Pill shown next to the job number (for example spots open). */
  status?: ReactNode;
  /** Line above the facts (for example "Outside your set availability"). */
  note?: ReactNode;
  /** Buttons or status at the bottom. */
  footer?: ReactNode;
}) {
  const estPay = toNum(job.hourly_rate) * toNum(job.est_hours);
  return (
    <Ticket>
      <Row between style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1, minWidth: 160, gap: 2 }}>
          <T kind="ticketNo">{`JOB #${job.job_number}`}</T>
          <T kind="bold">{companyName}</T>
        </View>
        {status}
      </Row>
      <View style={{ gap: 2 }}>
        <T kind="h3" accessibilityRole="header">
          {job.route}
        </T>
        <T kind="muted">{job.description}</T>
      </View>
      {note}
      <Facts
        items={[
          ['Date', fmtDate(job.work_date)],
          ['Start', fmtTime(job.start_time)],
          ['Est. hours', hrs(job.est_hours)],
          ['Role', job.role],
          ['Pay', perHour(job.hourly_rate)],
          ['Truck', job.truck],
        ]}
      />
      <T kind="smallMuted">
        {'Est. pay: '}
        <T kind="mono" style={{ fontWeight: '700' }}>
          {money(estPay)}
        </T>
        {` before taxes, paid by ${companyName}`}
      </T>
      {footer}
    </Ticket>
  );
}
