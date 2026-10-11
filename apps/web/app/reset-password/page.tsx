import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { ResetForm } from '@/components/auth/ResetForm';
import { getViewer } from '@/lib/auth';

export const metadata: Metadata = { title: 'Set a new password' };

export default async function ResetPasswordPage() {
  const { user } = await getViewer();
  if (!user) {
    return (
      <AuthCard title="Link expired" intro="That reset link has expired or was already used.">
        <Link className="btn" href="/forgot-password">Send a new link</Link>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Set a new password" intro={`Signed in as ${user.email ?? 'your account'}.`}>
      <ResetForm />
    </AuthCard>
  );
}
