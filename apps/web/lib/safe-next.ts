/**
 * Only allow same-site relative redirects ("/jobs?x=1"). Rejects absolute URLs, "//evil.com",
 * backslashes and control characters (browsers strip tabs/newlines, so "/\t/evil.com" would
 * otherwise become "//evil.com").
 */
export function safeNext(next: string | null | undefined, fallback = '/jobs'): string {
  if (!next || !next.startsWith('/') || /[\x00-\x1f\x7f\\]/.test(next)) return fallback;
  try {
    const base = 'https://liftcrew.invalid';
    const u = new URL(next, base);
    if (u.origin !== base) return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}
