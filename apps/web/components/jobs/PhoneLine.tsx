'use client';

import { useState } from 'react';

export function PhoneLine({ phone, name }: { phone: string; name: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return (
    <span className="phone">
      <a href={`tel:${phone.replace(/[^0-9+]/g, '')}`} aria-label={`Call ${name} at ${phone}`}>{phone}</a>
      <button type="button" className="btn quiet sm" onClick={copy} aria-label={`Copy ${name}'s phone number`}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </span>
  );
}
