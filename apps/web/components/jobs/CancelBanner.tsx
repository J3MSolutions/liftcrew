'use client';

import { weekdayOf } from '@liftcrew/shared';
import { useRouter } from 'next/navigation';
import { findMoversHref, moverName } from '@/lib/job-helpers';
import type { BookingRow, JobBundle } from '@/lib/types';
import { useToast } from '../Toast';

/** Shown when a mover cancels: green if a standby mover took the spot, red if it's open again. */
export function CancelBanner({ job, canceled, onDismiss }: { job: JobBundle; canceled: BookingRow; onDismiss: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const name = moverName(canceled.movers);
  const reason = (canceled.cancel_reason ?? 'no reason given').toLowerCase();
  const replacement = canceled.replaced_by_booking
    ? job.bookings.find((b) => b.id === canceled.replaced_by_booking)
    : undefined;

  if (canceled.replaced_by_booking) {
    return (
      <div className="banner ok" role="status">
        <div>
          <div>
            <b>
              {name} canceled ({reason}). {replacement ? moverName(replacement.movers) : 'Your standby mover'} was on
              standby and moved into the spot.
            </b>{' '}
            {canceled.late_cancel ? 'It counts as a late cancellation on their record.' : null}
          </div>
          <div className="row">
            <button type="button" className="btn quiet sm" onClick={onDismiss}>Got it</button>
          </div>
        </div>
      </div>
    );
  }

  const requests = job.job_requests.length;
  function findReplacement() {
    onDismiss();
    toast(`Showing ${job.role.toLowerCase()}s free on ${weekdayOf(job.work_date)}. Booking one fills the open spot.`);
    router.push(findMoversHref(job));
  }

  return (
    <div className="banner bad" role="alert">
      <div>
        <div>
          <b>{name} canceled ({reason}).</b> The spot is open again.
          {canceled.late_cancel ? ' It counts as a late cancellation on their record.' : ''}
          {requests ? ` ${requests} mover${requests > 1 ? 's have' : ' has'} already requested this job.` : ''}
        </div>
        <div className="row">
          <button type="button" className="btn sm" onClick={findReplacement}>Find a replacement</button>
          <button type="button" className="btn quiet sm" onClick={onDismiss}>Dismiss</button>
        </div>
      </div>
    </div>
  );
}
