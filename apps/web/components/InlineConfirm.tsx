'use client';

import { useEffect, useRef } from 'react';

/** In-page confirmation (never window.confirm). */
export function InlineConfirm({ prompt, confirmLabel, cancelLabel = 'Keep', busy, onConfirm, onCancel }: {
  prompt: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="confirm-inline" role="group" aria-label="Confirm">
      <span style={{ flex: '1 1 200px' }}>{prompt}</span>
      <button type="button" className="btn quiet sm" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
      <button ref={ref} type="button" className="btn danger-solid sm" onClick={onConfirm} disabled={busy}>
        {busy ? 'Working…' : confirmLabel}
      </button>
    </div>
  );
}
