import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/AuthCard';
import { LoginForm } from '@/components/auth/LoginForm';
import { safeNext } from '@/lib/safe-next';

export const metadata: Metadata = { title: 'Sign in' };

const LINK_ERROR = 'That link has expired or was already used. Sign in, or request a new link.';

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === 'string' ? sp.next : null);
  const notice = sp.error === 'link' ? LINK_ERROR : sp.reset === 'done' ? 'Password updated. Sign in with your new password.' : null;
  return (
    <AuthCard title="Sign in" intro="For moving companies booking crew on LiftCrew.">
      <LoginForm next={next} notice={notice} />
    </AuthCard>
  );
}
