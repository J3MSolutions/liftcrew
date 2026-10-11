import { fmtDate } from '@liftcrew/shared';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/auth/AuthCard';
import { CheckAgainButton } from '@/components/auth/CheckAgainButton';
import { LockIcon } from '@/components/Logo';
import { SignOutButton } from '@/components/SignOutButton';
import { getViewer, homeFor } from '@/lib/auth';

export const metadata: Metadata = { title: "We're verifying your company" };

export default async function VerifyingPage() {
  const viewer = await getViewer();
  const home = homeFor(viewer);
  if (home !== '/verifying' || !viewer.company) redirect(home);
  const c = viewer.company;

  return (
    <AuthCard wide title="We're verifying your company">
      <p>
        Thanks, {c.name}. Before you can post jobs or book movers, LiftCrew checks your Cal-T permit with the
        Bureau of Household Goods and Services and confirms your insurance. This usually takes{' '}
        <b>one business day</b>. You&apos;ll be able to use LiftCrew as soon as it&apos;s done.
      </p>
      <div className="readonly-box">
        <div className="line"><span className="muted">Company</span><span>{c.name} · {c.city}</span></div>
        <div className="line"><span className="muted">Cal-T permit</span><span className="mono">{c.permit_number}</span></div>
        <div className="line"><span className="muted">Insurance expires</span><span>{fmtDate(c.insurance_expires)}</span></div>
        <div className="line"><span className="muted">Job numbers</span><span className="mono">{c.job_prefix}-1000, {c.job_prefix}-1001…</span></div>
      </div>
      <div className="private">
        <LockIcon />
        <div>Movers and their reviews stay hidden until your company is verified. This keeps mover records private to real moving companies.</div>
      </div>
      <div className="row between">
        <CheckAgainButton />
        <SignOutButton />
      </div>
    </AuthCard>
  );
}
