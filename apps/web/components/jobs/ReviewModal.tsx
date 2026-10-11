'use client';

import { containsSensitiveNumber, COPY, firstName, fmtDate, NOTE_MAX, STRENGTHS } from '@liftcrew/shared';
import { useState } from 'react';
import type { BookingRow, JobBundle } from '@/lib/types';
import { LockIcon } from '../Logo';
import { Modal } from '../Modal';
import { useRpc } from '../useRpc';

type YesNo = boolean | null;

function YesNoField({ id, label, value, onChange, disabled, hint }: {
  id: string; label: string; value: YesNo; onChange: (v: boolean) => void; disabled?: boolean; hint?: string;
}) {
  return (
    <div>
      <div className="qlabel" id={id}>{label}</div>
      <div className="seg" role="group" aria-labelledby={id} style={{ marginTop: 6 }}>
        <button type="button" aria-pressed={value === true} disabled={disabled} onClick={() => onChange(true)}>Yes</button>
        <button type="button" aria-pressed={value === false} disabled={disabled} onClick={() => onChange(false)}>No</button>
      </div>
      {hint ? <p className="hint" style={{ marginTop: 4 }}>{hint}</p> : null}
    </div>
  );
}

export function ReviewModal({ job, booking, onClose }: { job: JobBundle; booking: BookingRow; onClose: () => void }) {
  const { run, busy } = useRpc();
  const name = booking.movers?.full_name ?? 'Mover';
  const first = firstName(name);
  const [showed, setShowed] = useState<YesNo>(null);
  const [onTime, setOnTime] = useState<YesNo>(null);
  const [rebook, setRebook] = useState<YesNo>(null);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const noShow = showed === false;
  const sensitive = containsSensitiveNumber(note);
  const ready = showed !== null && (noShow || onTime !== null) && rebook !== null && !sensitive;

  function setShowedValue(v: boolean) {
    setShowed(v);
    if (!v) setOnTime(false); // Didn't show up means not on time.
  }

  const toggleStrength = (s: string) =>
    setStrengths((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  async function save() {
    if (!ready || showed === null || rebook === null) return;
    const res = await run(
      'submit_review',
      {
        p_booking: booking.id,
        p_showed: showed,
        p_on_time: showed ? onTime === true : false,
        p_rebook: rebook,
        p_strengths: showed ? strengths : [],
        p_note: note.trim() || null,
      },
      `Review saved. Visible to moving companies and to ${first}.`,
    );
    if (res.ok) onClose();
  }

  return (
    <Modal title={`Review ${name}`} subtitle={`Job #${job.job_number} · ${fmtDate(job.work_date)}`} onClose={onClose}>
      <div className="private">
        <LockIcon />
        <div>{COPY.reviewsPrivacyCompany}</div>
      </div>
      <div className="fields">
        <YesNoField id="rv-showed" label="Did they show up?" value={showed} onChange={setShowedValue} />
        <YesNoField
          id="rv-ontime" label="Arrive on time?" value={noShow ? false : onTime} onChange={setOnTime} disabled={noShow}
          hint={noShow ? 'Set to No because they didn’t show up.' : undefined}
        />
        <YesNoField id="rv-rebook" label="Would you book them again?" value={rebook} onChange={setRebook} />
      </div>
      {!noShow && (
        <div>
          <div className="qlabel" id="rv-strengths">Strengths on this job (optional)</div>
          <div className="row" role="group" aria-labelledby="rv-strengths" style={{ marginTop: 6 }}>
            {STRENGTHS.map((s) => (
              <button key={s} type="button" className="toggle" aria-pressed={strengths.includes(s)} onClick={() => toggleStrength(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="field">
        <label htmlFor="rv-note">Note (optional, {NOTE_MAX} characters)</label>
        <textarea
          id="rv-note" rows={3} maxLength={NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)}
          aria-describedby="rv-note-count" aria-invalid={sensitive || undefined}
          placeholder="Example: Wrapped the dining set carefully and finished the truck load early."
        />
        <span className="hint" id="rv-note-count">{note.length}/{NOTE_MAX}</span>
        {sensitive ? <p className="form-error" role="alert">{COPY.sensitive}</p> : null}
      </div>
      <div className="row end">
        <button type="button" className="btn quiet" onClick={onClose}>Later</button>
        <button type="button" className="btn" onClick={save} disabled={!ready || busy !== null}>{busy ? 'Saving…' : 'Save review'}</button>
      </div>
    </Modal>
  );
}
