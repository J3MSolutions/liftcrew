'use client';

import { useEffect, useId, useRef } from 'react';

interface ModalProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}

/** Native <dialog> opened as a modal: focus is trapped and Escape closes it. */
export function Modal({ title, subtitle, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    const onCancel = (e: Event) => { e.preventDefault(); closeRef.current(); };
    d?.addEventListener('cancel', onCancel);
    return () => d?.removeEventListener('cancel', onCancel);
  }, []);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onMouseDown={(e) => { if (e.target === ref.current) onClose(); }}
    >
      <div className="modal-in">
        <div className="modal-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle ? <p className="muted small">{subtitle}</p> : null}
          </div>
          <button type="button" className="x" aria-label="Close" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
