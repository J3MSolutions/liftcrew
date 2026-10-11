import { Redirect } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Logo } from '../src/components/Logo';
import { Button, ErrorBox, Loading, Screen, Stack } from '../src/components/ui';
import { useAuth } from '../src/lib/auth';
import { homeFor } from '../src/lib/routes';

/** Gate: sends people to sign-in, onboarding, the company notice or their jobs. */
export default function Gate() {
  const { status, error, refresh, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const href = homeFor(status);
  if (href) return <Redirect href={href} />;

  if (status === 'error') {
    return (
      <Screen>
        <Stack gap={16}>
          <Logo />
          <ErrorBox message={error ?? 'Something went wrong. Try again.'} />
          <Button
            title="Try again"
            busy={busy}
            onPress={async () => {
              setBusy(true);
              await refresh();
              setBusy(false);
            }}
          />
          <Button title="Sign out" kind="quiet" onPress={signOut} />
        </Stack>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
        <Logo />
        <Loading />
      </View>
    </Screen>
  );
}
