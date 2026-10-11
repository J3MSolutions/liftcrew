import type { AccountStatus } from './auth';

/** Where each kind of signed-in (or signed-out) user belongs. */
export function homeFor(status: AccountStatus): string | null {
  switch (status) {
    case 'signedOut':
      return '/welcome';
    case 'company':
      return '/company';
    case 'needsProfile':
      return '/onboarding';
    case 'mover':
      return '/jobs';
    default:
      return null; // loading or error: stay on the gate screen
  }
}
