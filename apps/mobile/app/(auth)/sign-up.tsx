import { useRouter } from 'expo-router';
import { useState } from 'react';
import { friendlyError } from '@liftcrew/shared';
import { BackLink } from '../../src/components/BackLink';
import { Button, ErrorBox, Field, LinkButton, Notice, PageHead, Screen, Stack, T } from '../../src/components/ui';
import { useToast } from '../../src/components/Toast';
import { EMAIL_RE, MIN_PASSWORD, authCallbackUrl } from '../../src/lib/authLinks';
import { supabase } from '../../src/lib/supabase';

export default function SignUp() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function submit() {
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) return setError('Enter a valid email address.');
    if (password.length < MIN_PASSWORD) return setError(`Use a password with at least ${MIN_PASSWORD} characters.`);
    setError(null);
    setBusy(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: e,
      password,
      options: { data: { account_type: 'mover' }, emailRedirectTo: authCallbackUrl() },
    });
    setBusy(false);
    if (err) return setError(friendlyError(err));
    // With email confirmation on, an existing address comes back with no identities and no error.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return setError('An account with this email already exists. Sign in instead.');
    }
    // With a session we're signed in and the gate takes over; otherwise the email must be confirmed first.
    if (!data.session) setSentTo(e);
  }

  async function resend() {
    if (!sentTo) return;
    setBusy(true);
    const { error: err } = await supabase.auth.resend({ type: 'signup', email: sentTo, options: { emailRedirectTo: authCallbackUrl() } });
    setBusy(false);
    toast(err ? friendlyError(err) : `Sent another link to ${sentTo}.`);
  }

  if (sentTo) {
    return (
      <Screen>
        <BackLink />
        <PageHead title="Check your email" />
        <T>
          We sent a confirmation link to {sentTo}. Open it on this phone to finish creating your account, then come back
          and sign in if the app doesn't open by itself.
        </T>
        <Stack gap={10}>
          <Button title="Go to sign in" onPress={() => router.replace('/sign-in')} />
          <Button title="Send the link again" kind="quiet" busy={busy} onPress={resend} />
        </Stack>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackLink />
      <PageHead title="Create a mover account" sub="Next you'll add your work details. It takes about 3 minutes." />
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
        hint={`At least ${MIN_PASSWORD} characters.`}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <Button title="Create account" busy={busy} onPress={submit} />
      <LinkButton title="Already have an account? Sign in" onPress={() => router.replace('/sign-in')} />
      <Notice kind="kraft">
        This app is for movers. Moving companies sign up on the LiftCrew website.
      </Notice>
    </Screen>
  );
}
