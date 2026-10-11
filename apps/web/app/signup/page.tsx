import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/AuthCard';
import { SignupForm } from '@/components/auth/SignupForm';

export const metadata: Metadata = { title: 'Create a company account' };

export default function SignupPage() {
  return (
    <AuthCard
      title="Create a company account"
      intro="Post jobs and book ID-verified movers. You'll add your company details and Cal-T permit next."
    >
      <SignupForm />
    </AuthCard>
  );
}
