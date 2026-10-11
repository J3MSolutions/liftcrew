import { useRouter } from 'expo-router';
import { LinkButton } from './ui';

export function BackLink({ fallback = '/welcome' }: { fallback?: string }) {
  const router = useRouter();
  return (
    <LinkButton
      title="‹ Back"
      onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
    />
  );
}
