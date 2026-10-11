'use client';

import { friendlyError } from '@liftcrew/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const MIN_PASSWORD = 8;

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { account_type: 'company' },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });
    setBusy(false);
    if (signUpError) {
      setError(friendlyError(signUpError));
      return;
    }
    if (data.session) {
      // Email confirmation is off for this project: go straight to company details.
      router.replace('/onboarding');
      router.refresh();
      return;
    }
    setSentTo(email.trim());
  }

  if (sentTo) {
    return (
      <div className="banner ok" role="status">
        <div>
          <b>Check your email.</b>
          <p>We sent a confirmation link to {sentTo}. Open it on this device to finish setting up your company.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="email">Work email</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD}
            aria-describedby="pw-hint" value={password} onChange={(e) => setPassword(e.target.value)}
          />
          <span className="hint" id="pw-hint">At least {MIN_PASSWORD} characters.</span>
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button type="submit" className="btn" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        <p className="hint">Are you a mover? Download the LiftCrew mobile app instead.</p>
      </form>
      <div className="auth-foot">
        <span>Already have an account? <Link href="/login">Sign in</Link></span>
      </div>
    </>
  );
}
