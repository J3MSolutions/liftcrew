'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/** Signs a mover account out of the company site as soon as this page opens. */
export function MoversOnlySignOut() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    createClient().auth.signOut().finally(() => setDone(true));
  }, []);
  return (
    <div className="auth-foot">
      <span>{done ? 'You’ve been signed out of this site.' : 'Signing you out…'}</span>
      <span>Run a moving company? <Link href="/signup">Create a company account</Link> with a different email.</span>
    </div>
  );
}
