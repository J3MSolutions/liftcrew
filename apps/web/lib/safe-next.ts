/** Only allow same-site relative redirects ("/jobs"), never "//evil.com" or absolute URLs. */
export function safeNext(next: string | null | undefined, fallback = '/jobs'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}
