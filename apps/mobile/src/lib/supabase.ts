import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import type { RpcArgs, RpcName } from '@liftcrew/shared';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** False when the .env file is missing; the app shows setup instructions instead of crashing. */
export const supabaseConfigured = Boolean(url && anonKey);

// Only the anon (publishable) key ships in the app. Row-level security and the database
// functions decide what each signed-in mover can read and change.
export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'missing-anon-key', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Supabase's Expo guide: refresh the session only while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

/** Calls a database function and throws its error (show it with friendlyError). */
export async function rpc<N extends RpcName, R = unknown>(name: N, args: RpcArgs[N]): Promise<R> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data as R;
}

/** PostgREST returns one-to-one embeds as an object and one-to-many as an array. */
export function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}
