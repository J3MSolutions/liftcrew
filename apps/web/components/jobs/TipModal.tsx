'use client';

import { firstName, fmtDate, money } from '@liftcrew/shared';
import { useState } from 'react';
import type { BookingRow, JobBundle } from '@/lib/types';
import { Modal } from '../Modal';
import { useRpc } from '../useRpc';
import { RECORD_NOTE } from './CompleteJobModal';
import { TipInput } from './TipInput';

export function TipModal({ job, booking, onClose }: { job: JobBundle; booking: BookingRow; onClose: () => void }) {
  const { run, busy } = useRpc();
  const [tip, setTip] = useState('');
  const [error, setError] = useState<string | null>(null);
  const name = booking.movers?.full_name ?? 'Mover';

  async function save() {
    const v = Math.round(Number(tip) * 100) / 100;
    if (!Number.isFinite(v) || v <= 0 || v > 10000) return setError('Enter a tip between $0.01 and $10,000.');
    setError(null);
    const res = await run(
      'record_tip',
      { p_booking: booking.id, p_tip: v },
      `${money(v)} tip recorded for ${firstName(name)}. Pay it through your payroll, then mark it paid.`,
    );
    if (res.ok) onClose();
  }

  return (
    <Modal title={`Record a tip for ${name}`} subtitle={`Job #${job.job_number} · ${fmtDate(job.work_date)}`} onClose={onClose}>
      <div className="field">
        <label className="small" htmlFor="tip-one">Tip amount</label>
        <TipInput id="tip-one" value={tip} onChange={setTip} />
      </div>
      <p className="hint">
        This adds to any tip already recorded and marks the booking as pay due. {RECORD_NOTE}
      </p>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="row end">
        <button type="button" className="btn quiet" onClick={onClose}>Cancel</button>
        <button type="button" className="btn" onClick={save} disabled={busy !== null}>{busy ? 'Saving…' : 'Record tip'}</button>
      </div>
    </Modal>
  );
}
