import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { friendlyError, type Mover } from '@liftcrew/shared';
import { supabase } from './supabase';

export type AccountStatus =
  | 'loading'       // checking the stored session or loading the profile
  | 'signedOut'
  | 'company'       // signed in with a moving company account
  | 'needsProfile'  // mover account without a mover profile yet
  | 'mover'
  | 'error';

interface Account {
  uid: string;
  status: Exclude<AccountStatus, 'loading' | 'signedOut'>;
  mover: Mover | null;
  phone: string | null;
  error: string | null;
}

interface AuthValue {
  status: AccountStatus;
  session: Session | null;
  mover: Mover | null;
  phone: string | null;
  error: string | null;
  /** Reloads the profile, mover row and phone (after onboarding or saving the profile). */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

async function loadAccount(uid: string): Promise<Account> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('account_type')
    .eq('id', uid)
    .maybeSingle();
  if (error) return { uid, status: 'error', mover: null, phone: null, error: friendlyError(error) };
  if (!profile) {
    return { uid, status: 'error', mover: null, phone: null, error: "We couldn't find your account. Sign out and sign in again." };
  }
  if (profile.account_type === 'company') return { uid, status: 'company', mover: null, phone: null, error: null };

  const [m, p] = await Promise.all([
    supabase.from('movers').select('*').eq('id', uid).maybeSingle(),
    supabase.from('mover_private').select('phone').eq('mover_id', uid).maybeSingle(),
  ]);
  if (m.error) return { uid, status: 'error', mover: null, phone: null, error: friendlyError(m.error) };
  if (!m.data) return { uid, status: 'needsProfile', mover: null, phone: null, error: null };
  return { uid, status: 'mover', mover: m.data as Mover, phone: (p.data?.phone as string | undefined) ?? null, error: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // undefined = still reading the stored session
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSession(data.session);
    });
    // Keep this callback synchronous: calling Supabase inside it can deadlock the auth client.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const uid = session?.user.id ?? null;

  const refresh = useCallback(async () => {
    if (!uid) return;
    const next = await loadAccount(uid);
    setAccount(next);
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      setAccount(null);
      return;
    }
    let alive = true;
    loadAccount(uid).then((next) => {
      if (alive) setAccount(next);
    });
    return () => {
      alive = false;
    };
  }, [uid]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthValue>(() => {
    let status: AccountStatus;
    if (session === undefined) status = 'loading';
    else if (!session) status = 'signedOut';
    else if (!account || account.uid !== uid) status = 'loading';
    else status = account.status;
    const current = account && account.uid === uid ? account : null;
    return {
      status,
      session: session ?? null,
      mover: current?.mover ?? null,
      phone: current?.phone ?? null,
      error: current?.error ?? null,
      refresh,
      signOut,
    };
  }, [session, account, uid, refresh, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
