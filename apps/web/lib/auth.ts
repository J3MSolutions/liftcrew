import type { Company, Profile } from '@liftcrew/shared';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createClient } from './supabase/server';

export interface Viewer {
  supabase: SupabaseClient;
  user: User | null;
  profile: Profile | null;
  company: Company | null;
}

/** Who is signed in, their profile and their company. Cached for one request. */
export const getViewer = cache(async (): Promise<Viewer> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null, company: null };

  const [profileRes, companyRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('companies').select('*').eq('owner_id', user.id).maybeSingle(),
  ]);
  return {
    supabase,
    user,
    profile: (profileRes.data as Profile | null) ?? null,
    company: (companyRes.data as Company | null) ?? null,
  };
});

/** Where a signed-in user belongs, given their account state. */
export function homeFor(v: Viewer): string {
  if (!v.user) return '/login';
  if (v.profile?.account_type === 'mover') return '/movers-only';
  if (!v.company) return '/onboarding';
  if (!v.company.verified) return '/verifying';
  return '/jobs';
}

/** Gate for the company app. Redirects anyone who isn't the owner of a verified company. */
export async function requireCompany(): Promise<{ supabase: SupabaseClient; company: Company; user: User }> {
  const v = await getViewer();
  const home = homeFor(v);
  if (home !== '/jobs' || !v.user || !v.company) redirect(home);
  return { supabase: v.supabase, company: v.company, user: v.user };
}
