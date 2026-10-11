import { ROLES, WEEKDAYS } from '@liftcrew/shared';
import type { Weekday, WorkRole } from '@liftcrew/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { MoverCard } from '@/components/movers/MoverCard';
import { MoverFilters } from '@/components/movers/MoverFilters';
import { requireCompany } from '@/lib/auth';
import { getJobBoard } from '@/lib/jobs';
import { listMovers } from '@/lib/movers';

export const metadata: Metadata = { title: 'Find movers' };

type SP = Promise<Record<string, string | string[] | undefined>>;
const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');

export default async function FindMoversPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { company } = await requireCompany();

  const role = (ROLES as string[]).includes(str(sp.role)) ? (str(sp.role) as WorkRole) : 'All';
  const day = (WEEKDAYS as string[]).includes(str(sp.day)) ? (str(sp.day) as Weekday) : 'Any';
  const q = str(sp.q).slice(0, 80);
  const jobId = str(sp.job);

  const [board, movers] = await Promise.all([getJobBoard(company.id), listMovers({ role, day, q })]);
  const forJob = jobId ? board.active.find((j) => j.id === jobId) : undefined;
  const verified = movers.filter((m) => m.id_verified);
  const pending = movers.filter((m) => !m.id_verified);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Find movers</h1>
          {forJob ? (
            <p className="muted">
              Showing {role === 'All' ? 'movers' : `${role.toLowerCase()}s`}{day !== 'Any' ? ` free on ${day}` : ''} for job{' '}
              <span className="mono">#{forJob.job_number}</span> · {forJob.route}.{' '}
              <Link href="/movers">Clear</Link>
            </p>
          ) : (
            <p className="muted">
              Browse movers near you. Track records come from completed LiftCrew jobs only. Only ID-verified movers can be booked.
            </p>
          )}
        </div>
      </div>
      <MoverFilters key={q} role={role} day={day} q={q} jobId={forJob?.id} />
      {movers.length === 0 ? (
        <div className="empty">
          <p>No movers match these filters.</p>
          <p className="small">Try another day or role, or clear the search.</p>
          <Link className="btn quiet" href={forJob ? `/movers?job=${encodeURIComponent(forJob.id)}` : '/movers'}>Clear filters</Link>
        </div>
      ) : (
        <>
          <div className="grid">
            {verified.map((m) => <MoverCard key={m.id} mover={m} hire={board.hires[m.id]} jobId={forJob?.id} />)}
          </div>
          {verified.length === 0 ? (
            <div className="empty">No ID-verified movers match yet. The movers below can be booked once their ID check is done.</div>
          ) : null}
          {pending.length ? (
            <>
              <h2 className="section-label">ID check still in progress · not bookable yet</h2>
              <div className="grid">
                {pending.map((m) => <MoverCard key={m.id} mover={m} hire={board.hires[m.id]} jobId={forJob?.id} />)}
              </div>
            </>
          ) : null}
        </>
      )}
    </>
  );
}
