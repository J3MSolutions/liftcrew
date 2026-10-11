import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/auth/AuthCard';
import { OnboardingForm } from '@/components/auth/OnboardingForm';
import { SignOutButton } from '@/components/SignOutButton';
import { getViewer, homeFor } from '@/lib/auth';

export const metadata: Metadata = { title: 'Your company' };

export default async function OnboardingPage() {
  const viewer = await getViewer();
  const home = homeFor(viewer);
  if (home !== '/onboarding') redirect(home);
  return (
    <AuthCard
      wide
      title="Tell us about your company"
      intro="LiftCrew checks every moving company's Cal-T permit and insurance before it can book movers."
    >
      <OnboardingForm />
      <div className="auth-foot"><SignOutButton className="link-btn" /></div>
    </AuthCard>
  );
}
