'use client';

import Link from 'next/link';
import type { JobBoard } from '@/lib/types';
import { JobTicket } from './JobTicket';
import { useDismissed } from './useDismissed';

export function JobsBoard({ board, today }: { board: JobBoard; today: string }) {
  const [dismissed, dismiss] = useDismissed();
  const ticketProps = { board, today, dismissed, onDismiss: dismiss };

  return (
    <>
      <h2 className="section-label">Upcoming and in progress</h2>
      <div className="list">
        {board.active.length ? (
          board.active.map((j) => <JobTicket key={j.id} job={j} {...ticketProps} />)
        ) : (
          <div className="empty">
            <p>No active jobs. Post one to start booking crew.</p>
            <Link className="btn" href="/jobs/new">Post a job</Link>
          </div>
        )}
      </div>

      <h2 className="section-label">Completed</h2>
      <div className="list">
        {board.completed.length ? (
          board.completed.map((j) => <JobTicket key={j.id} job={j} {...ticketProps} />)
        ) : (
          <div className="empty">Completed jobs show up here. Mark a job complete after its date to record hours and tips.</div>
        )}
      </div>
    </>
  );
}
