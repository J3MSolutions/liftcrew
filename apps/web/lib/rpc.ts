import type { RpcArgs, RpcName } from '@liftcrew/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Typed wrapper around supabase.rpc so argument names always match the database. */
export async function callRpc<N extends RpcName, R = unknown>(
  supabase: SupabaseClient,
  name: N,
  args: RpcArgs[N],
): Promise<{ data: R | null; error: { message: string; code?: string } | null }> {
  const { data, error } = await supabase.rpc(name, args as Record<string, unknown>);
  return { data: (data as R) ?? null, error };
}
