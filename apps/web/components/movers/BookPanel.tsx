'use client';

import { firstName, fmtDate } from '@liftcrew/shared';
import type { HireStatus } from '@liftcrew/shared';
import Link from 'next/link';
import { useState } from 'react';
import { BookConfirmModal, type BookJob } from '../BookConfirmModal';

export type BookableJob = BookJob & { requested: boolean };

/** "Book for [job]" on a mover's profile. Opens the confirmation with wages, fee and paperwork note. */
export function BookPanel({ mover, jobs, preselect, hire, blockedReason }: {
  mover: { id: string; full_name: string };
  jobs: BookableJob[];
  preselect?: string;
  hire: HireStatus | undefined;
  /** Why this mover can't be booked right now, if they can't. */
  blockedReason: string | null;
}) {
  const first = firstName(mover.full_name);
  const [picked, setJobId] = useState(preselect ?? '');
  const [open, setOpen] = useState(false);
  // After a booking the list refreshes; fall back to the first job if the picked one filled up.
  const job = jobs.find((j) => j.id === picked) ?? jobs[0];
  const jobId = job?.id ?? '';

  if (blockedReason) return <p className="hint">{blockedReason}</p>;
  if (!jobs.length) {
    return (
      <p className="hint">
        You have no upcoming jobs with open spots. <Link href="/jobs/new">Post a job</Link> to book {first}.
      </p>
    );
  }

  return (
    <div className="book-panel">
      <label htmlFor="book-job" className="qlabel">Book for</label>
      <select id="book-job" value={jobId} onChange={(e) => setJobId(e.target.value)}>
        {jobs.map((j) => (
          <option key={j.id} value={j.id}>
            #{j.job_number} · {fmtDate(j.work_date)} · {j.route}{j.requested ? ` · ${first} requested it` : ''}
          </option>
        ))}
      </select>
      <button type="button" className="btn" disabled={!job} onClick={() => setOpen(true)}>Book {first}</button>
      {open && job ? (
        <BookConfirmModal job={job} mover={mover} hire={hire} requester={job.requested} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  );
}
