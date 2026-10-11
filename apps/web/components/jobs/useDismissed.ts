'use client';

import { useCallback, useEffect, useState } from 'react';

const KEY = 'liftcrew:dismissed-cancellations';

function read(): Set<string> {
  try {
    const raw = window.localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/** Cancellation banners the user dismissed on this browser. null until loaded (avoids a flash). */
export function useDismissed(): [Set<string> | null, (id: string) => void] {
  const [set, setSet] = useState<Set<string> | null>(null);
  useEffect(() => { setSet(read()); }, []);
  const dismiss = useCallback((id: string) => {
    setSet((prev) => {
      const next = new Set([...(prev ?? []), ...read(), id]);
      try {
        // Keep the list short; old booking ids no longer matter.
        window.localStorage.setItem(KEY, JSON.stringify([...next].slice(-300)));
      } catch {
        // Storage blocked: dismissal lasts for this page view only.
      }
      return next;
    });
  }, []);
  return [set, dismiss];
}
