import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/lib/auth';
import { useTheme } from '../../src/theme';

export default function AuthLayout() {
  const { status } = useAuth();
  const { c } = useTheme();
  // Once signed in, the gate decides where to go (onboarding, jobs or the company notice).
  if (status !== 'signedOut' && status !== 'loading') return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />;
}
