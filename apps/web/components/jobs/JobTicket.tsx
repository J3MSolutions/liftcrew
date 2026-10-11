'use client';

import { COPY, fmtDate, fmtTime, money, toNum } from '@liftcrew/shared';
import Link from 'next/link';
import { useState } from 'react';
import { canComplete, findMoversHref, hireOf, isActive, isPast, openSpots, reviewedIds } from '@/lib/job-helpers';
import type { BookingRow, JobBoard, JobBundle, RequestRow as RequestRowData } from '@/lib/types';
import { BookConfirmModal } from '../BookConfirmModal';
import { InlineConfirm } from '../InlineConfirm';
import { useRpc } from '../useRpc';
import { CancelBanner } from './CancelBanner';
import { CompleteJobModal } from './CompleteJobModal';
import { CrewRow } from './CrewRow';
import { RequestRow } from './RequestRow';
import { ReviewModal } from './ReviewModal';
import { StandbyBlock } from './StandbyBlock';
import { StandbyModal } from './StandbyModal';
import { TipModal } from './TipModal';

type Dialog =
  | { kind: 'complete' }
  | { kind: 'standby' }
  | { kind: 'tip'; booking: BookingRow }
  | { kind: 'review'; booking: BookingRow }
  | { kind: 'book'; request: RequestRowData };

function StatePill({ job, past, spots }: { job: JobBundle; past: boolean; spots: number }) {
  if (job.status === 'completed') return <span className="pill plain">Completed</span>;
  if (job.status === 'canceled') return <span className="pill plain">Canceled</span>;
  if (past) return <span className="pill warn">Needs wrap-up</span>;
  if (spots > 0) return <span className="pill info">{spots} of {job.crew_size} spots open</span>;
  return <span className="pill ok">Crew full</span>;
}

function Facts({ job }: { job: JobBundle }) {
  const facts: [string, string][] = [
    ['Date', fmtDate(job.work_date)],
    ['Start', fmtTime(job.start_time)],
    ['Est. hours', String(toNum(job.est_hours))],
    ['Role', job.crew_size > 1 ? `${job.role} × ${job.crew_size}` : job.role],
    ['Pay', `${money(job.hourly_rate)}/hr`],
    ['Truck', job.truck],
  ];
  return (
    <dl className="facts">
      {facts.map(([k, v]) => (
        <div className="fact" key={k}><dt className="k">{k}</dt><dd className="v">{v}</dd></div>
      ))}
    </dl>
  );
}

export function JobTicket({ job, board, today, dismissed, onDismiss }: {
  job: JobBundle;
  board: Pick<JobBoard, 'hires' | 'phones'>;
  today: string;
  dismissed: Set<string> | null;
  onDismiss: (bookingId: string) => void;
}) {
  const { run, busy } = useRpc();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const close = () => setDialog(null);

  const open = job.status === 'open';
  const past = isPast(job, today);
  const spots = openSpots(job);
  const reviewed = reviewedIds(job);

  // Open jobs show everyone except withdrawn bookings; finished jobs show the crew who worked it.
  const crew = job.bookings.filter((b) => (open ? b.status !== 'withdrawn' : b.status === 'completed'));
  const banners = open && dismissed
    ? job.bookings.filter((b) => b.status === 'canceled' && !dismissed.has(b.id))
    : [];
  const needPaper = job.bookings.some((b) => isActive(b) && hireOf(board.hires, b.mover_id) !== 'done');
  const hasConfirmed = job.bookings.some((b) => b.status === 'confirmed');
  const completable = canComplete(job, today);

  async function cancelJob() {
    const res = await run('cancel_job', { p_job: job.id }, `Job #${job.job_number} canceled. Everyone booked or on standby has been told.`, 'cancel');
    if (res.ok) setConfirmCancel(false);
  }

  return (
    <article className="ticket" aria-labelledby={`job-${job.id}`}>
      <div className="ticket-head">
        <div>
          <div className="ticket-no">JOB #{job.job_number}</div>
          <h3 id={`job-${job.id}`}>{job.route}</h3>
          <p className="muted small">{job.description}</p>
        </div>
        <StatePill job={job} past={past} spots={spots} />
      </div>
      <Facts job={job} />

      {banners.map((b) => (
        <CancelBanner key={b.id} job={job} canceled={b} onDismiss={() => onDismiss(b.id)} />
      ))}

      <div className="crew">
        {crew.length === 0 && job.job_requests.length === 0 ? (
          <p className="muted small">{open ? 'No one booked yet.' : 'No one worked this job.'}</p>
        ) : null}
        {crew.map((b) => (
          <CrewRow
            key={b.id}
            booking={b}
            hire={hireOf(board.hires, b.mover_id)}
            phone={board.phones[b.mover_id]}
            jobOpen={open}
            reviewed={reviewed.has(b.id)}
            onTip={() => setDialog({ kind: 'tip', booking: b })}
            onReview={() => setDialog({ kind: 'review', booking: b })}
          />
        ))}
        {open
          ? job.job_requests.map((r) => (
              <RequestRow
                key={r.mover_id}
                request={r}
                canBook={spots > 0 && !past}
                onBook={() => setDialog({ kind: 'book', request: r })}
              />
            ))
          : null}
      </div>

      {open && needPaper ? <p className="hint">{COPY.employerModel}</p> : null}

      <StandbyBlock job={job} past={past} onAdd={() => setDialog({ kind: 'standby' })} />

      {open ? (
        <div className="row">
          {!past && spots > 0 ? (
            <Link className="btn ghost" href={findMoversHref(job)}>Find movers for this job</Link>
          ) : null}
          {hasConfirmed || past ? (
            <button
              type="button"
              className={`btn${completable ? '' : ' quiet'}`}
              disabled={!completable}
              aria-describedby={completable ? undefined : `complete-hint-${job.id}`}
              onClick={() => setDialog({ kind: 'complete' })}
            >
              Mark job complete
            </button>
          ) : null}
          {!confirmCancel ? (
            <button type="button" className="btn quiet" onClick={() => setConfirmCancel(true)}>Cancel job</button>
          ) : null}
          {(hasConfirmed || past) && !completable ? (
            <span className="hint" id={`complete-hint-${job.id}`}>You can mark it complete on {fmtDate(job.work_date)}.</span>
          ) : null}
        </div>
      ) : null}

      {confirmCancel ? (
        <InlineConfirm
          prompt={
            <>
              <b>Cancel job #{job.job_number}?</b> Everyone booked, invited or on standby is taken off it.
              This can&apos;t be undone.
            </>
          }
          confirmLabel="Cancel job"
          cancelLabel="Keep job"
          busy={busy === 'cancel'}
          onConfirm={cancelJob}
          onCancel={() => setConfirmCancel(false)}
        />
      ) : null}

      {dialog?.kind === 'complete' ? <CompleteJobModal job={job} onClose={close} /> : null}
      {dialog?.kind === 'standby' ? <StandbyModal job={job} onClose={close} /> : null}
      {dialog?.kind === 'tip' ? <TipModal job={job} booking={dialog.booking} onClose={close} /> : null}
      {dialog?.kind === 'review' ? <ReviewModal job={job} booking={dialog.booking} onClose={close} /> : null}
      {dialog?.kind === 'book' ? (
        <BookConfirmModal
          job={job}
          mover={{ id: dialog.request.mover_id, full_name: dialog.request.movers?.full_name ?? 'Mover' }}
          hire={board.hires[dialog.request.mover_id]}
          requester
          onClose={close}
        />
      ) : null}
    </article>
  );
}
