import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { friendlyError } from '@liftcrew/shared';

export interface Loaded<T> {
  data: T | null;
  /** First load, before any data. */
  loading: boolean;
  /** Pull-to-refresh in progress. */
  refreshing: boolean;
  error: string | null;
  /** Pull-to-refresh: shows the spinner. */
  refresh: () => Promise<void>;
  /** Quiet reload after an action or when the screen regains focus. */
  reload: () => Promise<void>;
}

/**
 * Small per-screen data hook. Loads when the screen comes into focus (so switching tabs
 * shows fresh data), supports pull-to-refresh, and turns errors into readable messages.
 * `key` should change when the loader's inputs change (for example the mover id).
 */
export function useLoad<T>(loader: () => Promise<T>, key: string | null): Loaded<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const mounted = useRef(true);
  const seq = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (mode: 'quiet' | 'pull') => {
    if (key === null) return;
    const id = ++seq.current;
    if (mode === 'pull') setRefreshing(true);
    try {
      const next = await loaderRef.current();
      if (!mounted.current || id !== seq.current) return;
      setData(next);
      setError(null);
    } catch (e) {
      if (!mounted.current || id !== seq.current) return;
      setError(friendlyError(e));
    } finally {
      if (mounted.current && id === seq.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [key]);

  const reload = useCallback(() => run('quiet'), [run]);
  const refresh = useCallback(() => run('pull'), [run]);

  useFocusEffect(
    useCallback(() => {
      run('quiet');
    }, [run]),
  );

  return { data, loading: loading && data === null, refreshing, error, refresh, reload };
}

/** Throws a Supabase error so useLoad can show it. */
export function must<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw res.error;
  return (res.data ?? ([] as unknown)) as T;
}
