'use client';

import { ROLES, WEEKDAYS } from '@liftcrew/shared';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

/** Role, weekday and name/city filters. State lives in the URL so links and Back work. */
export function MoverFilters({ role, day, q, jobId }: { role: string; day: string; q: string; jobId?: string }) {
  const router = useRouter();
  const [text, setText] = useState(q);
  const [pending, start] = useTransition();

  function update(changes: Partial<Record<'role' | 'day' | 'q', string>>) {
    const merged = { job: jobId ?? '', role, day, q, ...changes };
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== 'All' && v !== 'Any') next.set(k, v);
    }
    const qs = next.toString();
    start(() => router.replace(qs ? `/movers?${qs}` : '/movers', { scroll: false }));
  }

  return (
    <form
      className="filters"
      role="search"
      aria-busy={pending || undefined}
      onSubmit={(e) => { e.preventDefault(); update({ q: text.trim() }); }}
    >
      <div className="field">
        <label htmlFor="f-role">Role</label>
        <select id="f-role" value={role} onChange={(e) => update({ role: e.target.value })}>
          <option value="All">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="f-day">Available on</label>
        <select id="f-day" value={day} onChange={(e) => update({ day: e.target.value })}>
          <option value="Any">Any day</option>
          {WEEKDAYS.map((d) => <option key={d} value={d}>Free on {d}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="f-q">Name or city</label>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <input id="f-q" type="search" placeholder="Search" value={text} onChange={(e) => setText(e.target.value)} style={{ flex: 1 }} />
          <button type="submit" className="btn quiet">{pending ? 'Searching…' : 'Search'}</button>
        </div>
      </div>
    </form>
  );
}
