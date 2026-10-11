import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/AuthCard';
import { ForgotForm } from '@/components/auth/ForgotForm';

export const metadata: Metadata = { title: 'Reset your password' };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Reset your password" intro="Enter your account email and we'll send you a link to set a new password.">
      <ForgotForm />
    </AuthCard>
  );
}
