'use client';

import { BOOKING_FEE, COPY, fmtDate, money, toNum } from '@liftcrew/shared';
import type { BookingFees } from '@liftcrew/shared';
import Link from 'next/link';
import { useState } from 'react';
import type { PayLine } from '@/lib/types';
import { PayPill } from '../Pills';
import { useRpc } from '../useRpc';
import { ExportModal, monthLabel } from './ExportModal';

function MarkPaid({ line }: { line: PayLine }) {
  const { run, busy } = useRpc();
  if (line.pay !== 'due') return null;
  const first = line.mover.split(/\s+/)[0] ?? line.mover;
  const onClick = () =>
    line.kind === 'standby'
      ? run('mark_standby_paid', { p_standby: line.id }, `Standby pay marked paid for ${first}.`)
      : run('mark_paid', { p_booking: line.id }, `Marked paid. ${first} sees it as paid.`);
  return (
    <button type="button" className="btn quiet sm" disabled={busy !== null} onClick={onClick}>
      {busy ? 'Saving…' : 'Mark paid'}<span className="sr-only"> for {line.mover}, job {line.jobNumber}</span>
    </button>
  );
}

/** "Invoiced Nov 1" for October's fees. */
function invoiceDate(monthStart: string): string {
  const [y, m] = monthStart.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m, 1, 12));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function Bill({ fees, today }: { fees: BookingFees[]; today: string }) {
  const thisMonth = today.slice(0, 7);
  const current = fees.find((f) => f.month.slice(0, 7) === thisMonth);
  const earlier = fees.filter((f) => f.month.slice(0, 7) !== thisMonth).slice(0, 6);
  const n = current?.bookings ?? 0;
  return (
    <div className="card" style={{ maxWidth: 460 }}>
      <div className="lines">
        <div className="line"><span>Bookings in {monthLabel(thisMonth).split(' ')[0]}</span><span className="mono">{n}</span></div>
        <div className="line"><span>Booking fee</span><span className="mono">{money(current?.fee_each ?? BOOKING_FEE)} each</span></div>
        <div className="line total"><span>Invoiced {invoiceDate(thisMonth + '-01')}</span><span className="mono">{money(current?.total ?? 0)}</span></div>
      </div>
      {earlier.length ? (
        <div className="lines small" style={{ borderTop: '1px dashed var(--line)', paddingTop: 8 }}>
          {earlier.map((f) => (
            <div className="line" key={f.month}>
              <span className="muted">{monthLabel(f.month.slice(0, 7))} · {f.bookings} booking{f.bookings === 1 ? '' : 's'}</span>
              <span className="mono">{money(f.total)}</span>
            </div>
          ))}
        </div>
      ) : null}
      <p className="hint">
        A booking counts once the mover accepts it. This is the only thing LiftCrew charges for.
      </p>
    </div>
  );
}

export function PayView({ lines, fees, companyName, jobPrefix, today }: {
  lines: PayLine[];
  fees: BookingFees[];
  companyName: string;
  jobPrefix: string;
  today: string;
}) {
  const [exporting, setExporting] = useState(false);
  const sum = (p: PayLine['pay']) => lines.filter((l) => l.pay === p).reduce((a, l) => a + l.total, 0);
  const tips = lines.filter((l) => l.pay === 'due' || l.pay === 'paid').reduce((a, l) => a + l.tip, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Pay records</h1>
          <p className="muted">{COPY.payRecords}</p>
        </div>
        <button type="button" className="btn" onClick={() => setExporting(true)} disabled={!lines.length}>Export</button>
      </div>
      <div className="row" style={{ marginBottom: 16 }}>
        <span className="pill warn">Due {money(sum('due'))}</span>
        <span className="pill ok">Paid {money(sum('paid'))}</span>
        <span className="pill info">Tips {money(tips)}</span>
      </div>

      <div className="table-wrap" role="region" aria-label="Pay records" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th scope="col">Job</th><th scope="col">Date</th><th scope="col">Mover</th>
              <th scope="col" className="num">Hours</th><th scope="col" className="num">Wages</th>
              <th scope="col" className="num">Tip</th><th scope="col" className="num">Total owed</th>
              <th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {lines.length ? (
              lines.map((l) => (
                <tr key={l.key}>
                  <td className="mono">{l.jobNumber}</td>
                  <td>{fmtDate(l.date)}</td>
                  <td>{l.mover}{l.kind === 'standby' ? <> <span className="pill plain">Standby</span></> : null}</td>
                  <td className="num">{l.hours == null ? '–' : toNum(l.hours)}</td>
                  <td className="num">{money(l.kind === 'standby' ? l.standby : l.wages)}</td>
                  <td className="num">{l.tip ? money(l.tip) : '–'}</td>
                  <td className="num">{money(l.total)}</td>
                  <td><PayPill pay={l.pay} /></td>
                  <td><MarkPaid line={l} /></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="muted" style={{ whiteSpace: 'normal' }}>
                  Completed jobs show up here. <Link href="/jobs">Mark a job complete</Link> to record hours and tips.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="section-label">Your LiftCrew bill</h2>
      <Bill fees={fees} today={today} />

      {exporting ? (
        <ExportModal lines={lines} companyName={companyName} jobPrefix={jobPrefix} today={today} onClose={() => setExporting(false)} />
      ) : null}
    </>
  );
}
