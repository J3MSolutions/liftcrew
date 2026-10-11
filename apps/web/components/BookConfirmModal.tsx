'use client';

import { BOOKING_FEE, firstName, fmtDate, money, PAPERWORK, toNum } from '@liftcrew/shared';
import type { HireStatus, Num } from '@liftcrew/shared';
import { LockIcon } from './Logo';
import { Modal } from './Modal';
import { useRpc } from './useRpc';

export interface BookJob {
  id: string; job_number: string; work_date: string; route: string; hourly_rate: Num; est_hours: Num;
}

/** Confirm a booking: est. wages, the $20 fee, and the hiring-paperwork note for new hires. */
export function BookConfirmModal({ job, mover, hire, requester, onClose, onBooked }: {
  job: BookJob;
  mover: { id: string; full_name: string };
  hire: HireStatus | undefined;
  /** The mover requested this job, so the booking is confirmed right away. */
  requester: boolean;
  onClose: () => void;
  onBooked?: () => void;
}) {
  const { run, busy } = useRpc();
  const first = firstName(mover.full_name);
  const rate = toNum(job.hourly_rate);
  const hours = toNum(job.est_hours);
  const newHire = hire !== 'done';

  async function book() {
    const paper = newHire ? ` Next: send ${first} your hiring paperwork.` : '';
    const res = requester
      ? await run('book_requester', { p_job: job.id, p_mover: mover.id }, `${first} is booked for #${job.job_number}.${paper}`)
      : await run('invite_mover', { p_job: job.id, p_mover: mover.id }, `Invitation sent to ${first}.${paper}`);
    if (res.ok) {
      onClose();
      onBooked?.();
    }
  }

  return (
    <Modal title={`Book ${mover.full_name}`} subtitle={`Job #${job.job_number} · ${fmtDate(job.work_date)} · ${job.route}`} onClose={onClose}>
      <div className="lines">
        <div className="line">
          <span>Est. wages ({money(rate)}/hr × {hours} hrs), paid through your payroll</span>
          <span className="mono">{money(rate * hours)}</span>
        </div>
        <div className="line total">
          <span>LiftCrew booking fee, on your monthly invoice</span>
          <span className="mono">{money(BOOKING_FEE)}</span>
        </div>
      </div>
      {newHire && (
        <div className="private">
          <LockIcon />
          <div>
            <b>{first} hasn&apos;t worked for you before.</b> You&apos;ll be the employer for this job. After booking, send {first} your
            new-hire paperwork ({PAPERWORK}) from your own payroll system, then mark it done on the job card.
          </div>
        </div>
      )}
      <p className="hint">
        {requester
          ? `${first} requested this job, so the booking is confirmed right away.`
          : `${first} has to accept before the spot is confirmed. The booking fee applies only once they accept.`}
      </p>
      <div className="row end">
        <button type="button" className="btn quiet" onClick={onClose}>Cancel</button>
        <button type="button" className="btn" onClick={book} disabled={busy !== null}>
          {busy ? 'Booking…' : requester ? 'Book' : 'Send invitation'}
        </button>
      </div>
    </Modal>
  );
}
