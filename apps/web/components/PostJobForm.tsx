'use client';

import { COPY, containsSensitiveNumber, fmtDate, ROLES, TRUCKS, weekdayOf } from '@liftcrew/shared';
import type { Job, WorkRole } from '@liftcrew/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { findMoversHref } from '@/lib/job-helpers';
import { useRpc } from './useRpc';

export function PostJobForm({ today, permit, insuranceExpires }: { today: string; permit: string; insuranceExpires: string }) {
  const router = useRouter();
  const { run, busy } = useRpc();
  const [f, setF] = useState({
    date: '', start: '08:00', hours: '5', route: '', description: '',
    role: 'Helper' as WorkRole, crew: '2', rate: '30', truck: TRUCKS[1] ?? TRUCKS[0]!,
  });
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((cur) => ({ ...cur, [k]: v }));

  function validate(): string | null {
    if (!f.date) return 'Pick the date of the move.';
    if (f.date < today) return 'Pick today or a future date.';
    if (!f.start) return 'Enter a start time.';
    const hours = Number(f.hours);
    if (!Number.isFinite(hours) || hours < 0.5 || hours > 16) return 'Estimated hours must be between 0.5 and 16.';
    if (f.route.trim().length < 2) return 'Enter the route, like "Petaluma → Novato".';
    if (f.description.trim().length < 2) return "Describe what's moving, like \"2-bed apartment, elevator building\".";
    if (containsSensitiveNumber(f.route) || containsSensitiveNumber(f.description)) return COPY.sensitive;
    const crew = Number(f.crew);
    if (!Number.isInteger(crew) || crew < 1 || crew > 20) return 'How many movers: enter a whole number from 1 to 20.';
    const rate = Number(f.rate);
    if (!Number.isFinite(rate) || rate <= 0 || rate > 500) return 'Enter an hourly pay between $1 and $500.';
    return null;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const problem = validate();
    setError(problem);
    if (problem) return;
    const day = weekdayOf(f.date);
    const res = await run<'post_job', Job>(
      'post_job',
      {
        p_work_date: f.date,
        p_start_time: f.start,
        p_est_hours: Number(f.hours),
        p_route: f.route.trim(),
        p_description: f.description.trim(),
        p_crew_size: Number(f.crew),
        p_role: f.role,
        p_hourly_rate: Math.round(Number(f.rate) * 100) / 100,
        p_truck: f.truck,
      },
      (job) => `Job #${job.job_number} posted. Here are ${f.role.toLowerCase()}s free on ${day}.`,
    );
    if (res.ok) router.push(findMoversHref(res.data));
    else setError(res.message);
  }

  const insuranceLapsed = insuranceExpires < today;

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <div className="fields">
        <div className="field">
          <label htmlFor="p-date">Date</label>
          <input id="p-date" type="date" min={today} required value={f.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="p-start">Start time</label>
          <input id="p-start" type="time" required value={f.start} onChange={(e) => set('start', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="p-hours">Estimated hours</label>
          <input id="p-hours" type="number" inputMode="decimal" min={0.5} max={16} step={0.5} required value={f.hours} onChange={(e) => set('hours', e.target.value)} />
        </div>
      </div>
      <div className="fields">
        <div className="field">
          <label htmlFor="p-route">Route</label>
          <input id="p-route" required maxLength={120} placeholder="Petaluma → Novato" value={f.route} onChange={(e) => set('route', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="p-what">What&apos;s moving</label>
          <input id="p-what" required maxLength={240} placeholder="2-bed apartment, elevator building" value={f.description} onChange={(e) => set('description', e.target.value)} />
        </div>
      </div>
      <div className="fields">
        <div className="field">
          <label htmlFor="p-role">Role needed</label>
          <select id="p-role" value={f.role} onChange={(e) => set('role', e.target.value as WorkRole)}>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="p-crew">How many</label>
          <input id="p-crew" type="number" inputMode="numeric" min={1} max={20} step={1} required value={f.crew} onChange={(e) => set('crew', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="p-rate">Hourly pay</label>
          <input
            id="p-rate" type="number" inputMode="decimal" min={1} max={500} step={0.5} required aria-describedby="p-rate-hint"
            value={f.rate} onChange={(e) => set('rate', e.target.value)}
          />
          <span className="hint" id="p-rate-hint">Bay Area helpers typically $25–40/hr (estimate)</span>
        </div>
        <div className="field">
          <label htmlFor="p-truck">Truck</label>
          <select id="p-truck" value={f.truck} onChange={(e) => set('truck', e.target.value)}>
            {TRUCKS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      {f.date ? <p className="hint">That&apos;s a {weekdayOf(f.date)}, {fmtDate(f.date)}. Movers free on {weekdayOf(f.date)}s see it first.</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="row">
        <button className="btn" type="submit" disabled={busy !== null}>{busy ? 'Posting…' : 'Post job'}</button>
        {insuranceLapsed ? (
          <span className="hint" style={{ color: 'var(--warn)' }}>
            The insurance on file expired {fmtDate(insuranceExpires)}. Contact LiftCrew with your new policy dates.
          </span>
        ) : (
          <span className="hint">
            Your Cal-T permit <span className="mono">{permit}</span> and insurance (exp. {fmtDate(insuranceExpires)}) are on file.
          </span>
        )}
      </div>
    </form>
  );
}
