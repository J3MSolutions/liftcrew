'use client';

import { firstName, fmtDate, friendlyError, money, STANDBY_PAY, weekdayOf } from '@liftcrew/shared';
import { useEffect, useMemo, useState } from 'react';
import { isActive } from '@/lib/job-helpers';
import { loadStandbyCandidates, type StandbyCandidate } from '@/lib/movers-client';
import { createClient } from '@/lib/supabase/client';
import type { JobBundle } from '@/lib/types';
import { Avatar } from '../Pills';
import { Modal } from '../Modal';
import { useRpc } from '../useRpc';

export function StandbyModal({ job, onClose }: { job: JobBundle; onClose: () => void }) {
  const { run, busy } = useRpc();
  const day = weekdayOf(job.work_date);
  const [movers, setMovers] = useState<StandbyCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exclude = useMemo(
    () =>
      new Set([
        ...job.bookings.filter(isActive).map((b) => b.mover_id),
        ...job.standby.filter((s) => s.status === 'offered' || s.status === 'accepted').map((s) => s.mover_id),
      ]),
    [job],
  );

  useEffect(() => {
    let live = true;
    loadStandbyCandidates(createClient(), day, exclude)
      .then((list) => { if (live) setMovers(list); })
      .catch((e) => { if (live) setError(friendlyError(e)); });
    return () => { live = false; };
  }, [day, exclude]);

  async function offer(m: StandbyCandidate) {
    const res = await run('offer_standby', { p_job: job.id, p_mover: m.id }, `Standby offer sent to ${firstName(m.full_name)}.`, m.id);
    if (res.ok) onClose();
  }

  return (
    <Modal title="Add a standby mover" subtitle={`#${job.job_number} · ${fmtDate(job.work_date)} · ${job.route}`} onClose={onClose}>
      <p>
        A standby mover agrees to keep the day open. If anyone on this crew cancels, they move into the spot
        automatically at the same rate. If no one cancels, you owe them {money(STANDBY_PAY)} standby pay through
        your payroll. You can have up to two.
      </p>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {!movers && !error ? <p className="muted" aria-busy="true">Loading movers…</p> : null}
      {movers && (
        <div className="crew">
          {movers.length === 0 ? (
            <div className="empty">Everyone available is already on this job. Try again after more movers sign up.</div>
          ) : (
            movers.map((m) => {
              const free = m.available_days.includes(day);
              return (
                <div key={m.id} className="crew-row">
                  <div className="who-line">
                    <Avatar name={m.full_name} />
                    <div><b>{m.full_name}</b><div className="muted small">{m.roles.join(', ')} · {m.city}</div></div>
                  </div>
                  <div className="row">
                    {free ? <span className="pill ok">Free {day}</span> : <span className="pill plain">Not usually free {day}</span>}
                    <button type="button" className="btn sm" disabled={busy !== null} onClick={() => offer(m)}>
                      {busy === m.id ? 'Sending…' : 'Offer standby'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </Modal>
  );
}
