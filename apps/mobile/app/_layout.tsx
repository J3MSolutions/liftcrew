import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '../src/components/Toast';
import { AuthProvider } from '../src/lib/auth';
import { supabaseConfigured } from '../src/lib/supabase';
import { fonts, useTheme } from '../src/theme';

export default function RootLayout() {
  const { c, dark } = useTheme();

  if (!supabaseConfigured) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, padding: 24, justifyContent: 'center', gap: 12 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 28, fontWeight: '700', color: c.ink }}>Almost ready</Text>
        <Text style={{ color: c.ink, fontSize: 15, lineHeight: 22 }}>
          Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to apps/mobile/.env (see .env.example), then
          restart Expo with "npx expo start --clear".
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          <StatusBar style={dark ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
