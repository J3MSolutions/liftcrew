import { Redirect } from 'expo-router';
import { Logo } from '../src/components/Logo';
import { Button, Notice, PageHead, Screen, Stack } from '../src/components/ui';
import { useAuth } from '../src/lib/auth';

/** Signed in with a moving company account: point them to the website. */
export default function CompanyAccount() {
  const { status, session, signOut } = useAuth();
  if (status !== 'company') return <Redirect href="/" />;
  return (
    <Screen>
      <Stack gap={16}>
        <Logo />
        <PageHead
          title="This app is for movers"
          sub="Moving companies use the LiftCrew website to post jobs, book crew and keep pay records."
        />
        <Notice kind="info" lock={false}>
          {`You're signed in as ${session?.user.email ?? 'a moving company'}, which is a company account. To work as a mover, sign out and create a separate mover account with a different email.`}
        </Notice>
        <Button title="Sign out" onPress={signOut} />
      </Stack>
    </Screen>
  );
}
