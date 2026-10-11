import { COPY, firstName, money, todayISO } from '@liftcrew/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LockIcon } from '@/components/Logo';
import { BookPanel, type BookableJob } from '@/components/movers/BookPanel';
import { pct, yearsLabel } from '@/components/movers/MoverCard';
import { ReviewCard } from '@/components/movers/ReviewCard';
import { Avatar, BackgroundPill, Days } from '@/components/Pills';
import { requireCompany } from '@/lib/auth';
import { bookableJobs, getJobBoard } from '@/lib/jobs';
import { getMoverProfile } from '@/lib/movers';

export const metadata: Metadata = { title: 'Mover profile' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function MoverProfilePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();
  const { company } = await requireCompany();
  const [profile, board] = await Promise.all([getMoverProfile(id), getJobBoard(company.id)]);
  if (!profile) notFound();

  const { mover: m, reviews } = profile;
  const first = firstName(m.full_name);
  const s = m.stats;
  const hire = board.hires[m.id];
  const jobParam = typeof sp.job === 'string' ? sp.job : undefined;

  const jobs: BookableJob[] = bookableJobs(board, m.id, todayISO()).map((j) => ({
    id: j.id, job_number: j.job_number, work_date: j.work_date, route: j.route,
    hourly_rate: j.hourly_rate, est_hours: j.est_hours,
    requested: j.job_requests.some((r) => r.mover_id === m.id),
  }));
  const blockedReason = !m.id_verified
    ? `${first} can be booked once their ID check is done.`
    : m.background === 'not_clear'
      ? `${first} can't be booked right now.`
      : null;

  return (
    <>
      <Link className="back" href={jobParam ? `/movers?job=${encodeURIComponent(jobParam)}` : '/movers'}>← Find movers</Link>
      <div className="card" style={{ gap: 16 }}>
        <div className="profile-head">
          <Avatar name={m.full_name} large />
          <div style={{ minWidth: 0 }}>
            <h1>{m.full_name}</h1>
            <p className="muted small">
              {m.city} · {m.roles.join(', ')} · License: {m.license} ·{' '}
              {m.years_experience ? `${yearsLabel(m.years_experience)} experience` : 'New to moving'}
            </p>
          </div>
        </div>
        {m.bio ? <p style={{ overflowWrap: 'anywhere' }}>{m.bio}</p> : null}
        <div className="row">
          {m.id_verified ? <span className="pill ok">ID verified</span> : <span className="pill warn">ID check pending</span>}
          <BackgroundPill status={m.background} />
          {hire === 'done' ? <span className="pill info">On your payroll</span> : null}
          {hire === 'sent' ? <span className="pill info">Your paperwork sent</span> : null}
          {hire !== 'done' ? <span className="pill plain mono">{money(m.asking_rate)}/hr asking</span> : null}
        </div>
        <div className="stats five">
          <div className="stat"><b>{s?.jobs_completed ?? 0}</b><span>Jobs</span></div>
          <div className="stat"><b>{pct(s?.on_time_pct)}</b><span>On time</span></div>
          <div className="stat"><b>{pct(s?.rebook_pct)}</b><span>Rebook</span></div>
          <div className="stat"><b>{s ? s.no_shows : '–'}</b><span>No-shows</span></div>
          <div className="stat"><b>{s ? s.late_cancels : '–'}</b><span>Late cancels</span></div>
        </div>
        {s && s.late_cancels > 0 ? (
          <p className="small">
            <span className="pill warn">{s.late_cancels} late cancellation{s.late_cancels > 1 ? 's' : ''}</span>{' '}
            <span className="muted">Canceled less than 48 hours before a job.</span>
          </p>
        ) : null}
        <div>
          <div className="qlabel" style={{ marginBottom: 6 }}>Usually available</div>
          <Days days={m.available_days} />
        </div>
        <BookPanel
          mover={{ id: m.id, full_name: m.full_name }}
          jobs={jobs}
          preselect={jobParam}
          hire={hire}
          blockedReason={blockedReason}
        />
      </div>

      <h2 className="section-label">Company reviews</h2>
      <div className="private" style={{ marginBottom: 12 }}>
        <LockIcon />
        <div>{COPY.reviewsPrivacyCompany}</div>
      </div>
      <div className="list">
        {reviews.length ? (
          reviews.map((r) => <ReviewCard key={r.id} review={r} moverName={m.full_name} />)
        ) : (
          <div className="empty">No company reviews yet. Reviews come only from completed jobs.</div>
        )}
      </div>
    </>
  );
}
