import { useState } from 'react';
import { friendlyError } from '@liftcrew/shared';
import { BackLink } from '../../src/components/BackLink';
import { Button, ErrorBox, Field, Notice, PageHead, Screen } from '../../src/components/ui';
import { EMAIL_RE, authCallbackUrl } from '../../src/lib/authLinks';
import { supabase } from '../../src/lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) return setError('Enter a valid email address.');
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(e, { redirectTo: authCallbackUrl('recovery') });
    setBusy(false);
    if (err) return setError(friendlyError(err));
    setSent(true);
  }

  return (
    <Screen>
      <BackLink fallback="/sign-in" />
      <PageHead title="Reset your password" sub="We'll email you a link to choose a new one." />
      {error ? <ErrorBox message={error} /> : null}
      {sent ? (
        <Notice kind="ok" lock={false} title="Check your email">
          If there's a LiftCrew account for that email, a reset link is on its way. Open it on this phone to choose a new
          password.
        </Notice>
      ) : null}
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={submit}
      />
      <Button title={sent ? 'Send another link' : 'Send reset link'} busy={busy} onPress={submit} />
    </Screen>
  );
}
