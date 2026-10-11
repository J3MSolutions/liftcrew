'use client';

import { firstName, MAX_STANDBY_PER_JOB, money, STANDBY_PAY } from '@liftcrew/shared';
import type { StandbyStatus } from '@liftcrew/shared';
import { useState } from 'react';
import { moverName } from '@/lib/job-helpers';
import type { JobBundle, StandbyRow } from '@/lib/types';
import { InlineConfirm } from '../InlineConfirm';
import { Avatar, PayPill, StandbyPill } from '../Pills';
import { useRpc } from '../useRpc';

const SUB: Partial<Record<StandbyStatus, string>> = {
  accepted: `Holding the day. You owe ${money(STANDBY_PAY)} standby pay if they aren't called in.`,
  offered: 'Waiting for a reply',
  declined: 'Not available',
  held: `Held the day open · ${money(STANDBY_PAY)} standby pay`,
};

function StandbyLine({ s }: { s: StandbyRow }) {
  const { run, busy } = useRpc();
  const [confirming, setConfirming] = useState(false);
  const name = moverName(s.movers);
  const first = firstName(name);
  const withdrawable = s.status === 'offered' || s.status === 'accepted';

  async function withdraw() {
    const res = await run('withdraw_standby', { p_standby: s.id }, `Standby offer to ${first} withdrawn.`, 'withdraw');
    if (res.ok) setConfirming(false);
  }

  return (
    <div className="crew-row">
      <div className="who-line">
        <Avatar name={name} />
        <div>
          <b>{name}</b>
          <div className="muted small">{s.status === 'held' && s.standby_pay != null ? `Held the day open · ${money(s.standby_pay)} standby pay` : SUB[s.status]}</div>
        </div>
      </div>
      <div className="row">
        {s.status === 'held' ? <PayPill pay={s.pay_status} /> : <StandbyPill status={s.status} />}
        {s.status === 'held' && s.pay_status === 'due' ? (
          <button
            type="button" className="btn quiet sm" disabled={busy !== null}
            onClick={() => run('mark_standby_paid', { p_standby: s.id }, `Standby pay marked paid for ${first}.`, 'paid')}
          >
            {busy === 'paid' ? 'Saving…' : 'Mark paid'}
          </button>
        ) : null}
        {withdrawable && !confirming ? (
          <button type="button" className="btn quiet sm" onClick={() => setConfirming(true)}>Withdraw</button>
        ) : null}
      </div>
      {confirming ? (
        <div style={{ flexBasis: '100%' }}>
          <InlineConfirm
            prompt={`Withdraw the standby offer to ${first}? They're free to take other work that day.`}
            confirmLabel="Withdraw offer"
            busy={busy === 'withdraw'}
            onConfirm={withdraw}
            onCancel={() => setConfirming(false)}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Standby movers for a job: up to two who hold the day and move in automatically if someone cancels. */
export function StandbyBlock({ job, past, onAdd }: { job: JobBundle; past: boolean; onAdd: () => void }) {
  const open = job.status === 'open';
  const shown = job.standby.filter((s) =>
    open ? ['offered', 'accepted', 'declined'].includes(s.status) : s.status === 'held',
  );
  const live = job.standby.filter((s) => s.status === 'offered' || s.status === 'accepted').length;
  const canAdd = open && !past && live < MAX_STANDBY_PER_JOB;
  if (!shown.length && !canAdd) return null;

  return (
    <div className="crew">
      <div className="row between">
        <span className="ticket-no">STANDBY · moves in automatically if someone cancels</span>
        {canAdd ? <button type="button" className="btn ghost sm" onClick={onAdd}>Add standby mover</button> : null}
      </div>
      {shown.map((s) => <StandbyLine key={s.id} s={s} />)}
    </div>
  );
}
