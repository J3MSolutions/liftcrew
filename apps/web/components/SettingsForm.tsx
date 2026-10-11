'use client';

import { COPY, containsSensitiveNumber, friendlyError } from '@liftcrew/shared';
import type { Company } from '@liftcrew/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from './Toast';

type Editable = Pick<Company, 'id' | 'name' | 'city' | 'payroll_portal_name' | 'payroll_portal_url'>;

/** Company name, city and payroll portal: the only company columns the app may update. */
export function SettingsForm({ company }: { company: Editable }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(company.name);
  const [city, setCity] = useState(company.city);
  const [portalName, setPortalName] = useState(company.payroll_portal_name ?? '');
  const [portalUrl, setPortalUrl] = useState(company.payroll_portal_url ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function validate(): string | null {
    if (name.trim().length < 2 || name.trim().length > 120) return 'Enter your company name (2–120 characters).';
    if (city.trim().length < 2 || city.trim().length > 80) return 'Enter your city (2–80 characters).';
    if ([name, city, portalName].some((v) => containsSensitiveNumber(v))) return COPY.sensitive;
    const pn = portalName.trim();
    const pu = portalUrl.trim();
    if (pn.length > 60) return 'Keep the portal name to 60 characters.';
    if (pu && !/^https:\/\/\S{3,300}$/.test(pu)) return 'Enter the portal web address starting with https://';
    if (pu && !pn) return 'Give the portal a name, like "Gusto" or "ADP employee portal".';
    if (pn && !pu) return 'Add the portal web address, starting with https://';
    return null;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const problem = validate();
    setError(problem);
    if (problem) return;
    setBusy(true);
    const { error: updateError } = await createClient()
      .from('companies')
      .update({
        name: name.trim(),
        city: city.trim(),
        payroll_portal_name: portalName.trim() || null,
        payroll_portal_url: portalUrl.trim() || null,
      })
      .eq('id', company.id);
    setBusy(false);
    if (updateError) {
      setError(friendlyError(updateError));
      return;
    }
    toast('Settings saved.');
    router.refresh();
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <div className="fields">
        <div className="field">
          <label htmlFor="s-name">Company name</label>
          <input id="s-name" required maxLength={120} autoComplete="organization" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="s-city">City</label>
          <input id="s-city" required maxLength={80} autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
      </div>
      <div>
        <h2 className="qlabel" style={{ fontFamily: 'var(--body)' }}>Payroll portal</h2>
        <p className="hint">Where movers you employ get their W-2s and pay stubs. LiftCrew points them there and never stores tax documents.</p>
      </div>
      <div className="fields">
        <div className="field">
          <label htmlFor="s-pname">Portal name</label>
          <input id="s-pname" maxLength={60} placeholder="Gusto" value={portalName} onChange={(e) => setPortalName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="s-purl">Web address</label>
          <input id="s-purl" type="url" inputMode="url" maxLength={308} placeholder="https://app.gusto.com" value={portalUrl} onChange={(e) => setPortalUrl(e.target.value)} />
        </div>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div><button type="submit" className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button></div>
    </form>
  );
}
