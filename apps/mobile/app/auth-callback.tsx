import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { friendlyError } from '@liftcrew/shared';
import { Button, ErrorBox, Field, Loading, PageHead, Screen } from '../src/components/ui';
import { useToast } from '../src/components/Toast';
import { MIN_PASSWORD } from '../src/lib/authLinks';
import { supabase } from '../src/lib/supabase';

/** Reads both ?query and #fragment parameters from a Supabase email link. */
function linkParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const hashAt = url.indexOf('#');
  const queryAt = url.indexOf('?');
  const query = queryAt >= 0 ? url.slice(queryAt + 1, hashAt > queryAt ? hashAt : undefined) : '';
  const hash = hashAt >= 0 ? url.slice(hashAt + 1) : '';
  for (const part of [query, hash]) {
    for (const kv of part.split('&')) {
      if (!kv) continue;
      const i = kv.indexOf('=');
      const k = decodeURIComponent(i >= 0 ? kv.slice(0, i) : kv);
      const v = i >= 0 ? decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')) : '';
      out[k] = v;
    }
  }
  return out;
}

/**
 * Landing screen for links in Supabase emails (confirm sign-up, reset password).
 * Signs in with the tokens in the link; for a password reset, asks for the new password.
 */
export default function AuthCallback() {
  const url = Linking.useURL();
  const router = useRouter();
  const toast = useToast();
  const handled = useRef<string | null>(null);
  const [mode, setMode] = useState<'working' | 'recovery' | 'error'>('working');
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!url || handled.current === url) return;
    handled.current = url;
    const p = linkParams(url);
    (async () => {
      if (p.error_description || p.error) {
        setError(p.error_description || 'This link has expired or was already used. Request a new one.');
        setMode('error');
        return;
      }
      let err: unknown = null;
      if (p.code) {
        ({ error: err } = await supabase.auth.exchangeCodeForSession(p.code));
      } else if (p.access_token && p.refresh_token) {
        ({ error: err } = await supabase.auth.setSession({ access_token: p.access_token, refresh_token: p.refresh_token }));
      } else {
        router.replace('/');
        return;
      }
      if (err) {
        setError(friendlyError(err));
        setMode('error');
        return;
      }
      if (p.type === 'recovery') setMode('recovery');
      else router.replace('/');
    })();
  }, [url, router]);

  // Opened without a usable link (for example from history): don't spin forever.
  useEffect(() => {
    const t = setTimeout(() => {
      if (handled.current === null) router.replace('/');
    }, 6000);
    return () => clearTimeout(t);
  }, [router]);

  async function savePassword() {
    if (password.length < MIN_PASSWORD) return setError(`Use a password with at least ${MIN_PASSWORD} characters.`);
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(friendlyError(err));
    toast('Password updated.');
    router.replace('/');
  }

  if (mode === 'recovery') {
    return (
      <Screen>
        <PageHead title="Choose a new password" />
        {error ? <ErrorBox message={error} /> : null}
        <Field
          label="New password"
          hint={`At least ${MIN_PASSWORD} characters.`}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          onSubmitEditing={savePassword}
        />
        <Button title="Save password" busy={busy} onPress={savePassword} />
      </Screen>
    );
  }

  if (mode === 'error') {
    return (
      <Screen>
        <PageHead title="That link didn't work" />
        <ErrorBox message={error ?? 'Request a new link and try again.'} />
        <Button title="Back to sign in" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <Loading label="Signing you in" />
    </Screen>
  );
}
