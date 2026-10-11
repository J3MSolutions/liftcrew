'use client';

import { friendlyError } from '@liftcrew/shared';
import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function ForgotForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    if (resetError) setError(friendlyError(resetError));
    else setSent(true);
  }

  return (
    <>
      {sent ? (
        <div className="banner ok" role="status">
          <div>
            <b>Check your email.</b>
            <p>If an account uses {email.trim()}, a reset link is on its way. Open it on this device.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button type="submit" className="btn" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
      <div className="auth-foot"><Link href="/login">Back to sign in</Link></div>
    </>
  );
}
