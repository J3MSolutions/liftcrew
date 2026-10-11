'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type Tone = 'info' | 'bad';
interface ToastState { id: number; msg: string; tone: Tone }
type ToastFn = (msg: string, tone?: Tone) => void;

const ToastContext = createContext<ToastFn>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback<ToastFn>((msg, tone = 'info') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), msg, tone });
    timer.current = setTimeout(() => setToast(null), tone === 'bad' ? 6000 : 4200);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div role="status" aria-live="polite" className="sr-only">{toast?.msg ?? ''}</div>
      {toast && (
        <div key={toast.id} className={`toast${toast.tone === 'bad' ? ' bad' : ''}`} aria-hidden="true" onClick={() => setToast(null)}>
          {toast.msg}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
