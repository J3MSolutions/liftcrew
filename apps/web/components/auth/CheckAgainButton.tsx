'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function CheckAgainButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" className="btn" disabled={pending} onClick={() => start(() => router.refresh())}>
      {pending ? 'Checking…' : 'Check again'}
    </button>
  );
}
