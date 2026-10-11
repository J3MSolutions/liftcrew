'use client';

import { friendlyError } from '@liftcrew/shared';
import type { RpcArgs, RpcName } from '@liftcrew/shared';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { callRpc } from '@/lib/rpc';
import { createClient } from '@/lib/supabase/client';
import { useToast } from './Toast';

/**
 * Runs a database function, then refreshes server data and shows a short toast.
 * Returns the function's result, or null on failure (the error is shown as a toast).
 */
export function useRpc() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const run = useCallback(
    async <N extends RpcName, R = unknown>(
      name: N,
      args: RpcArgs[N],
      success?: string | ((data: R) => string),
      key: string = name,
    ): Promise<{ ok: true; data: R } | { ok: false; message: string }> => {
      setBusy(key);
      try {
        const { data, error } = await callRpc<N, R>(createClient(), name, args);
        if (error) {
          const message = friendlyError(error);
          toast(message, 'bad');
          return { ok: false, message };
        }
        if (success) toast(typeof success === 'function' ? success(data as R) : success);
        router.refresh();
        return { ok: true, data: data as R };
      } catch (e) {
        const message = friendlyError(e);
        toast(message, 'bad');
        return { ok: false, message };
      } finally {
        setBusy(null);
      }
    },
    [router, toast],
  );

  return { run, busy };
}
