import { money } from '@liftcrew/shared';
import type { HireStatus } from '@liftcrew/shared';
import Link from 'next/link';
import type { MoverCardData } from '@/lib/types';
import { Avatar, Days } from '../Pills';

export const pct = (v: number | null | undefined) => (v == null ? '–' : `${v}%`);
export const yearsLabel = (y: number) => (y ? `${y} yr${y > 1 ? 's' : ''}` : 'New');

export function MoverCard({ mover: m, hire, jobId }: { mover: MoverCardData; hire: HireStatus | undefined; jobId?: string }) {
  const s = m.stats;
  const href = `/movers/${m.id}${jobId ? `?job=${encodeURIComponent(jobId)}` : ''}`;
  return (
    <article className="card" aria-labelledby={`mv-${m.id}`}>
      <div className="who-line">
        <Avatar name={m.full_name} large />
        <div>
          <h3 id={`mv-${m.id}`}>{m.full_name}</h3>
          <div className="muted small">{m.city} · {yearsLabel(m.years_experience)} · {m.roles.join(', ')}</div>
        </div>
      </div>
      <div className="stats">
        <div className="stat"><b>{s?.jobs_completed ?? 0}</b><span>Jobs</span></div>
        <div className="stat"><b>{pct(s?.on_time_pct)}</b><span>On time</span></div>
        <div className="stat"><b>{pct(s?.rebook_pct)}</b><span>Rebook</span></div>
      </div>
      <Days days={m.available_days} />
      <div className="row between">
        <span>
          {!m.id_verified ? (
            <span className="pill warn">ID check pending</span>
          ) : hire === 'done' ? (
            <span className="pill info">On your payroll</span>
          ) : (
            <span className="mono">{money(m.asking_rate)}/hr asking</span>
          )}
        </span>
        <Link className="btn" href={href}>View profile<span className="sr-only"> of {m.full_name}</span></Link>
      </div>
    </article>
  );
}
