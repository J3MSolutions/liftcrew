'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavProps {
  companyName: string;
  city: string;
  attention: number;
  payDue: number;
}

const ITEMS = [
  { href: '/jobs', label: 'Jobs', badge: 'attention' as const },
  { href: '/jobs/new', label: 'Post a job' },
  { href: '/movers', label: 'Find movers' },
  { href: '/pay', label: 'Pay records', badge: 'payDue' as const },
  { href: '/settings', label: 'Settings' },
];

export function Nav({ companyName, city, attention, payDue }: NavProps) {
  const path = usePathname() ?? '';
  const isCurrent = (href: string) =>
    href === '/jobs' ? path === '/jobs' : path === href || path.startsWith(href + '/');

  return (
    <nav className="nav" aria-label="Main">
      <div className="who">
        <strong>{companyName}</strong>Moving company · {city}
      </div>
      {ITEMS.map((item) => {
        const n = item.badge === 'attention' ? attention : item.badge === 'payDue' ? payDue : 0;
        const label = item.badge === 'attention' ? 'need attention' : 'with pay due';
        return (
          <Link key={item.href} href={item.href} aria-current={isCurrent(item.href) ? 'page' : undefined}>
            {item.label}
            {n > 0 && (
              <span className="count">
                {n}
                <span className="sr-only"> {label}</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
