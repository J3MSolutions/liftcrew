import { useRouter } from 'expo-router';
import { useState } from 'react';
import { friendlyError } from '@liftcrew/shared';
import { BackLink } from '../../src/components/BackLink';
import { Button, ErrorBox, Field, LinkButton, PageHead, Screen } from '../../src/components/ui';
import { EMAIL_RE } from '../../src/lib/authLinks';
import { supabase } from '../../src/lib/supabase';

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) return setError('Enter a valid email address.');
    if (!password) return setError('Enter your password.');
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: e, password });
    setBusy(false);
    if (err) {
      if (/email not confirmed/i.test(err.message)) {
        return setError('Confirm your email first. Open the link we sent you, then sign in.');
      }
      if (/invalid login credentials/i.test(err.message)) {
        return setError("That email and password don't match. Check them, or reset your password.");
      }
      return setError(friendlyError(err));
    }
    // The (auth) layout sends signed-in people to the gate.
  }

  return (
    <Screen>
      <BackLink />
      <PageHead title="Sign in" />
      {error ? <ErrorBox message={error} /> : null}
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Button title="Sign in" busy={busy} onPress={submit} />
      <LinkButton title="Forgot your password?" onPress={() => router.push('/forgot-password')} />
      <LinkButton title="New to LiftCrew? Create a mover account" onPress={() => router.replace('/sign-up')} />
    </Screen>
  );
}
