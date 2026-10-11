import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Logo } from '../../src/components/Logo';
import { Button, Notice, Screen, Stack, T } from '../../src/components/ui';

export default function Welcome() {
  const router = useRouter();
  return (
    <Screen>
      <View style={{ minHeight: 560, justifyContent: 'space-between', gap: 32, paddingTop: 24 }}>
        <Stack gap={20}>
          <Logo size={1.3} />
          <T kind="h2" accessibilityRole="header">
            Moving work, on the days you choose.
          </T>
          <T kind="muted">
            Moving companies in your area post jobs that need crew. Set the days you can work and your rate, request jobs,
            and keep a record of your hours, tips and pay.
          </T>
          <Notice title="Who pays you" kind="kraft">
            Each moving company that books you is your employer for that job and pays you through its own payroll.
            LiftCrew is free for movers.
          </Notice>
        </Stack>
        <Stack gap={10}>
          <Button title="Create a mover account" onPress={() => router.push('/sign-up')} />
          <Button title="Sign in" kind="ghost" onPress={() => router.push('/sign-in')} />
          <T kind="smallMuted" style={{ textAlign: 'center', marginTop: 8 }}>
            Moving company? Use the LiftCrew website to post jobs and book crew.
          </T>
        </Stack>
      </View>
    </Screen>
  );
}
