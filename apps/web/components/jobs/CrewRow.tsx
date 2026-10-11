'use client';

import { firstName, money, toNum } from '@liftcrew/shared';
import type { HireStatus } from '@liftcrew/shared';
import Link from 'next/link';
import { useState } from 'react';
import { estWages, isActive, moverName } from '@/lib/job-helpers';
import type { BookingRow } from '@/lib/types';
import { InlineConfirm } from '../InlineConfirm';
import { Avatar, HirePill, PayPill, StatusPill } from '../Pills';
import { useRpc } from '../useRpc';
import { PhoneLine } from './PhoneLine';

export interface CrewRowProps {
  booking: BookingRow;
  hire: HireStatus;
  phone: string | undefined;
  jobOpen: boolean;
  reviewed: boolean;
  onTip: () => void;
  onReview: () => void;
}

function subline(b: BookingRow): string {
  if (b.status === 'canceled') {
    return `${b.cancel_reason ?? 'No reason given'}${b.late_cancel ? ' · late cancellation' : ''}`;
  }
  if (b.status === 'completed') {
    if (b.pay_status === 'none' && toNum(b.tip) === 0) return 'No hours worked';
    const tip = toNum(b.tip);
    return `${toNum(b.hours_worked)} hrs · ${money(b.wages)} wages${tip ? ` + ${money(tip)} tip` : ''}`;
  }
  if (b.status === 'declined') return 'Declined the invitation';
  return `${money(estWages(b))} est. wages${b.from_standby ? ' · moved up from standby' : ''}`;
}

/** One booking on a job ticket: who, status, pay, paperwork and the actions that apply. */
export function CrewRow({ booking: b, hire, phone, jobOpen, reviewed, onTip, onReview }: CrewRowProps) {
  const { run, busy } = useRpc();
  const [confirming, setConfirming] = useState(false);
  const name = moverName(b.movers);
  const first = firstName(name);
  const active = isActive(b);
  const completed = b.status === 'completed';
  const showPaperwork = (active || completed) && hire !== 'done';

  const setHire = (status: 'sent' | 'done') =>
    run(
      'set_hire_status',
      { p_mover: b.mover_id, p_status: status },
      status === 'sent'
        ? `Marked as sent. ${first} sees that your paperwork is on its way.`
        : `${first} is set up in your payroll.`,
      'hire',
    );

  async function withdraw() {
    const res = await run('withdraw_booking', { p_booking: b.id }, `${first} is off this job. The spot is open again.`, 'withdraw');
    if (res.ok) setConfirming(false);
  }

  return (
    <div className="crew-row">
      <div className="who-line">
        <Avatar name={name} />
        <div>
          <b>{name}</b>
          <div className="muted small">{subline(b)}</div>
          {phone && (active || completed) ? <PhoneLine phone={phone} name={name} /> : null}
        </div>
      </div>
      <div className="row">
        <StatusPill status={b.status} />
        {showPaperwork ? <HirePill hire={hire} /> : null}
        {completed ? <PayPill pay={b.pay_status} /> : null}
        {showPaperwork && hire === 'needed' ? (
          <button type="button" className="btn quiet sm" disabled={busy !== null} onClick={() => setHire('sent')}>
            Mark paperwork sent
          </button>
        ) : null}
        {showPaperwork && hire === 'sent' ? (
          <button type="button" className="btn quiet sm" disabled={busy !== null} onClick={() => setHire('done')}>
            Mark set up in payroll
          </button>
        ) : null}
        {completed && b.pay_status === 'due' ? (
          <button
            type="button" className="btn quiet sm" disabled={busy !== null}
            onClick={() => run('mark_paid', { p_booking: b.id }, `Marked paid. ${first} sees it as paid.`, 'paid')}
          >
            {busy === 'paid' ? 'Saving…' : 'Mark paid'}
          </button>
        ) : null}
        {completed && b.pay_status !== 'none' ? (
          <button type="button" className="btn quiet sm" onClick={onTip}>Add tip</button>
        ) : null}
        {completed && !reviewed ? (
          <button type="button" className="btn sm" onClick={onReview}>Review {first}</button>
        ) : null}
        {active && jobOpen && !confirming ? (
          <button type="button" className="btn danger sm" onClick={() => setConfirming(true)}>Withdraw</button>
        ) : null}
        <Link className="btn quiet sm" href={`/movers/${b.mover_id}`}>Profile</Link>
      </div>
      {confirming ? (
        <div style={{ flexBasis: '100%' }}>
          <InlineConfirm
            prompt={
              b.status === 'pending'
                ? `Take back the invitation to ${first}?`
                : `Take ${first} off this job? They're told right away and the spot opens up.`
            }
            confirmLabel={b.status === 'pending' ? 'Withdraw invitation' : 'Withdraw booking'}
            busy={busy === 'withdraw'}
            onConfirm={withdraw}
            onCancel={() => setConfirming(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
