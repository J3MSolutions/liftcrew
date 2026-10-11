import Link from 'next/link';

export function TruckMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <rect x="3" y="7" width="17" height="15" rx="2" fill="var(--blanket)" />
      <path d="M20 12h4.5l3 4.5V22H20z" fill="var(--kraft-tape)" />
      <circle cx="9" cy="23.5" r="2.6" fill="var(--ink)" />
      <circle cx="23" cy="23.5" r="2.6" fill="var(--ink)" />
      <path d="M7 12h9M7 16h6" stroke="var(--on-blanket)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="logo" aria-label="LiftCrew home">
      <TruckMark />
      LiftCrew
    </Link>
  );
}

export function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
