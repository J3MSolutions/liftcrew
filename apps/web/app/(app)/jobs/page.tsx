import { todayISO } from '@liftcrew/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { JobsBoard } from '@/components/jobs/JobsBoard';
import { requireCompany } from '@/lib/auth';
import { getJobBoard } from '@/lib/jobs';

export const metadata: Metadata = { title: 'Jobs' };

export default async function JobsPage() {
  const { company } = await requireCompany();
  const board = await getJobBoard(company.id);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Jobs</h1>
          <p className="muted">Book crew, wrap up finished jobs and review the movers who worked them.</p>
        </div>
        <Link className="btn" href="/jobs/new">Post a job</Link>
      </div>
      <JobsBoard board={board} today={todayISO()} />
    </>
  );
}
