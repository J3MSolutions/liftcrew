import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/AuthCard';
import { MoversOnlySignOut } from '@/components/auth/MoversOnlySignOut';

export const metadata: Metadata = { title: 'Movers use the mobile app' };

export default function MoversOnlyPage() {
  return (
    <AuthCard title="Movers use the mobile app" intro="This site is for moving companies. Movers use the LiftCrew mobile app.">
      <MoversOnlySignOut />
    </AuthCard>
  );
}
