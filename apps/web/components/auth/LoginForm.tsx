'use client';

import { friendlyError } from '@liftcrew/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export const MOVER_MESSAGE = 'This site is for moving companies. Movers use the LiftCrew mobile app.';

export function LoginForm({ next, notice }: { next: string; notice: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError || !data.user) {
      setBusy(false);
      setError(
        signInError?.message === 'Invalid login credentials'
          ? 'That email and password don’t match. Check them and try again.'
          : signInError?.message === 'Email not confirmed'
            ? 'Confirm your email first. We sent you a link when you signed up.'
            : friendlyError(signInError),
      );
      return;
    }
    const { data: profile } = await supabase.from('profiles').select('account_type').eq('id', data.user.id).maybeSingle();
    if (profile?.account_type === 'mover') {
      await supabase.auth.signOut();
      setBusy(false);
      setError(MOVER_MESSAGE);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <>
      {notice ? <p className="banner" role="status">{notice}</p> : null}
      <form onSubmit={onSubmit} noValidate={false}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button type="submit" className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <div className="auth-foot">
        <Link href="/forgot-password">Forgot your password?</Link>
        <span>New to LiftCrew? <Link href="/signup">Create a company account</Link></span>
      </div>
    </>
  );
}
