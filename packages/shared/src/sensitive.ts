// Same rules as public.contains_sensitive_number() in the database, so forms can warn before submitting.
// The database is the real gate; this is only for faster feedback.
const PATTERNS = [
  /(^|[^0-9])[0-9]{3}[- ][0-9]{2}[- ][0-9]{4}([^0-9]|$)/, // 123-45-6789
  /(^|[^0-9])[0-9]{9,17}([^0-9]|$)/, // 123456789, bank account numbers
  /(^|[^0-9])([0-9][ -]?){12,18}[0-9]([^0-9]|$)/, // card numbers with spaces or dashes
];

export function containsSensitiveNumber(text: string | null | undefined): boolean {
  const t = text ?? '';
  return PATTERNS.some((p) => p.test(t));
}
