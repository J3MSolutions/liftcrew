import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, assertEnv } from '../env';

let browserClient: SupabaseClient | undefined;

/** Supabase client for Client Components. One instance per browser tab. */
export function createClient(): SupabaseClient {
  if (!browserClient) {
    assertEnv();
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return browserClient;
}
