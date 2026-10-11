import { todayISO } from '@liftcrew/shared';
import type { Metadata } from 'next';
import { PostJobForm } from '@/components/PostJobForm';
import { requireCompany } from '@/lib/auth';

export const metadata: Metadata = { title: 'Post a job' };

export default async function PostJobPage() {
  const { company } = await requireCompany();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Post a job</h1>
          <p className="muted">
            Movers who are free that day see it in Open jobs and can request it. You can also invite movers directly.
          </p>
        </div>
      </div>
      <PostJobForm today={todayISO()} permit={company.permit_number} insuranceExpires={company.insurance_expires} />
    </>
  );
}
