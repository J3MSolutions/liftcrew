import { todayISO } from '@liftcrew/shared';
import { Logo } from '@/components/Logo';
import { Nav } from '@/components/Nav';
import { SignOutButton } from '@/components/SignOutButton';
import { requireCompany } from '@/lib/auth';
import { needsAttention } from '@/lib/job-helpers';
import { getJobBoard } from '@/lib/jobs';

async function payDueCount(): Promise<number> {
  const { supabase } = await requireCompany();
  // Row-level security limits these to this company's jobs.
  const [b, s] = await Promise.all([
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('pay_status', 'due'),
    supabase.from('standby').select('id', { count: 'exact', head: true }).eq('pay_status', 'due'),
  ]);
  return (b.count ?? 0) + (s.count ?? 0);
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { company } = await requireCompany();
  const today = todayISO();
  const [board, payDue] = await Promise.all([getJobBoard(company.id), payDueCount()]);
  const attention = [...board.active, ...board.completed].filter((j) => needsAttention(j, board.hires, today)).length;

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="top">
        <Logo href="/jobs" />
        <div className="top-right">
          <span className="company">{company.name}</span>
          <SignOutButton />
        </div>
      </header>
      <div className="shell">
        <Nav companyName={company.name} city={company.city} attention={attention} payDue={payDue} />
        <main id="main">{children}</main>
      </div>
    </>
  );
}
