import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { todayISO } from '@liftcrew/shared';
import { supabase } from './supabase';

interface BadgeValue {
  /** Pending invitations + standby offers waiting for an answer. */
  count: number;
  refreshBadge: () => Promise<void>;
}

const BadgeContext = createContext<BadgeValue>({ count: 0, refreshBadge: async () => {} });

async function countWaiting(moverId: string): Promise<number> {
  const today = todayISO();
  // Only offers on jobs that are still open and not in the past can be answered.
  const [b, s] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, jobs!inner(status, work_date)')
      .eq('mover_id', moverId)
      .eq('status', 'pending')
      .eq('jobs.status', 'open')
      .gte('jobs.work_date', today),
    supabase
      .from('standby')
      .select('id, jobs!inner(status, work_date)')
      .eq('mover_id', moverId)
      .eq('status', 'offered')
      .eq('jobs.status', 'open')
      .gte('jobs.work_date', today),
  ]);
  return (b.data?.length ?? 0) + (s.data?.length ?? 0);
}

export function BadgeProvider({ moverId, children }: { moverId: string; children: ReactNode }) {
  const [count, setCount] = useState(0);

  const refreshBadge = useCallback(async () => {
    try {
      setCount(await countWaiting(moverId));
    } catch {
      // The badge is a hint; the Bookings tab shows the real list and any error.
    }
  }, [moverId]);

  useEffect(() => {
    refreshBadge();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshBadge();
    });
    return () => sub.remove();
  }, [refreshBadge]);

  const value = useMemo(() => ({ count, refreshBadge }), [count, refreshBadge]);
  return <BadgeContext.Provider value={value}>{children}</BadgeContext.Provider>;
}

export function useBadge(): BadgeValue {
  return useContext(BadgeContext);
}
