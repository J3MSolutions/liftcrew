'use client';

import { firstName } from '@liftcrew/shared';
import Link from 'next/link';
import { moverName } from '@/lib/job-helpers';
import type { RequestRow as RequestRowData } from '@/lib/types';
import { Avatar } from '../Pills';

/** A mover who requested the job. Booking them confirms right away. */
export function RequestRow({ request, canBook, onBook }: { request: RequestRowData; canBook: boolean; onBook: () => void }) {
  const name = moverName(request.movers);
  const verified = request.movers?.id_verified ?? false;
  return (
    <div className="crew-row">
      <div className="who-line">
        <Avatar name={name} />
        <div>
          <b>{name}</b> <span className="muted small">requested this job</span>
          {request.movers ? <div className="muted small">{request.movers.roles.join(', ')} · {request.movers.city}</div> : null}
        </div>
      </div>
      <div className="row">
        {!verified ? <span className="pill warn">ID check pending</span> : null}
        <Link className="btn quiet sm" href={`/movers/${request.mover_id}`}>Profile</Link>
        {canBook && verified ? (
          <button type="button" className="btn sm" onClick={onBook}>Book {firstName(name)}</button>
        ) : null}
      </div>
    </div>
  );
}
