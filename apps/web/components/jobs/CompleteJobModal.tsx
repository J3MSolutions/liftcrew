'use client';

import { fmtDate, money, STANDBY_PAY, toNum } from '@liftcrew/shared';
import { useState } from 'react';
import type { JobBundle } from '@/lib/types';
import { Avatar } from '../Pills';
import { Modal } from '../Modal';
import { useRpc } from '../useRpc';
import { TipInput } from './TipInput';

export const RECORD_NOTE =
  "LiftCrew records hours and tips but doesn't move money. Pay wages and tips through your own payroll; tips belong entirely to the mover.";

export function CompleteJobModal({ job, onClose }: { job: JobBundle; onClose: () => void }) {
  const { run, busy } = useRpc();
  const crew = job.bookings.filter((b) => b.status === 'confirmed');
  const standbyCount = job.standby.filter((s) => s.status === 'accepted').length;
  const [entries, setEntries] = useState<Record<string, { hours: string; tip: string }>>(() =>
    Object.fromEntries(crew.map((b) => [b.id, { hours: String(toNum(b.est_hours)), tip: '' }])),
  );
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (id: string, k: 'hours' | 'tip', v: string) =>
    setEntries((e) => ({ ...e, [id]: { ...(e[id] ?? { hours: '', tip: '' }), [k]: v } }));

  async function submit() {
    const parsed: { booking_id: string; hours: number; tip: number }[] = [];
    let owed = standbyCount * STANDBY_PAY;
    for (const b of crew) {
      const e = entries[b.id] ?? { hours: '', tip: '' };
      const hours = Number(e.hours);
      const tip = e.tip.trim() === '' ? 0 : Number(e.tip);
      const name = b.movers?.full_name ?? 'each mover';
      if (e.hours.trim() === '' || !Number.isFinite(hours) || hours < 0 || hours > 24)
        return setError(`Enter hours between 0 and 24 for ${name}.`);
      if (!Number.isFinite(tip) || tip < 0 || tip > 10000)
        return setError(`Enter a tip between $0 and $10,000 for ${name}, or leave it blank.`);
      const roundedTip = Math.round(tip * 100) / 100;
      parsed.push({ booking_id: b.id, hours, tip: roundedTip });
      owed += Math.round(hours * toNum(b.hourly_rate) * 100) / 100 + roundedTip;
    }
    setError(null);
    const msg = alreadyPaid
      ? `Job #${job.job_number} complete and marked paid. Leave a quick review for each mover.`
      : owed > 0
        ? `Job #${job.job_number} complete. ${money(owed)} is due to the crew through your payroll; mark it paid on Pay records.`
        : `Job #${job.job_number} complete.`;
    const res = await run('complete_job', { p_job: job.id, p_entries: parsed, p_already_paid: alreadyPaid }, msg);
    if (res.ok) onClose();
  }

  return (
    <Modal title="Wrap up job" subtitle={`#${job.job_number} · ${fmtDate(job.work_date)} · ${job.route}`} onClose={onClose}>
      <p>
        Record the hours each mover worked and any tip.
        {standbyCount > 0 &&
          ` ${standbyCount === 1 ? 'The standby mover who held the day is' : `The ${standbyCount} standby movers who held the day are`} owed ${money(STANDBY_PAY)} each.`}
      </p>
      {crew.length === 0 ? (
        <div className="empty">No one is confirmed on this crew. Completing closes the job with no hours recorded.</div>
      ) : (
        <div className="crew">
          {crew.map((b) => {
            const name = b.movers?.full_name ?? 'Mover';
            const e = entries[b.id] ?? { hours: '', tip: '' };
            return (
              <div key={b.id} className="crew-row" style={{ alignItems: 'end' }}>
                <div className="who-line">
                  <Avatar name={name} />
                  <div><b>{name}</b><div className="muted small">{money(b.hourly_rate)}/hr</div></div>
                </div>
                <div className="row" style={{ alignItems: 'end' }}>
                  <div className="field">
                    <label className="small" htmlFor={`hrs-${b.id}`}>Hours</label>
                    <input
                      id={`hrs-${b.id}`} type="number" inputMode="decimal" min={0} max={24} step="0.25" style={{ width: 84 }}
                      value={e.hours} onChange={(ev) => set(b.id, 'hours', ev.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label className="small" htmlFor={`tip-${b.id}`}>Tip</label>
                    <TipInput id={`tip-${b.id}`} value={e.tip} onChange={(v) => set(b.id, 'tip', v)} label={`Tip for ${name} in dollars`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <label className="check">
        <input type="checkbox" checked={alreadyPaid} onChange={(e) => setAlreadyPaid(e.target.checked)} />
        <span>I&apos;ve already paid this crew through our payroll</span>
      </label>
      <p className="hint">{RECORD_NOTE}</p>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="row end">
        <button type="button" className="btn quiet" onClick={onClose}>Cancel</button>
        <button type="button" className="btn" onClick={submit} disabled={busy !== null}>{busy ? 'Saving…' : 'Complete job'}</button>
      </div>
    </Modal>
  );
}
