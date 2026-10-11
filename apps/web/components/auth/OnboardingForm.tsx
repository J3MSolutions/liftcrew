'use client';

import { containsSensitiveNumber, COPY, friendlyError, todayISO } from '@liftcrew/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { callRpc } from '@/lib/rpc';
import { createClient } from '@/lib/supabase/client';

export function OnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [permit, setPermit] = useState('');
  const [insurance, setInsurance] = useState('');
  const [prefix, setPrefix] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function validate(): string | null {
    if (name.trim().length < 2) return 'Enter your company name.';
    if (city.trim().length < 2) return 'Enter the city you work from.';
    if (containsSensitiveNumber(name) || containsSensitiveNumber(city)) return COPY.sensitive;
    if (!/^[A-Z0-9-]{4,20}$/.test(permit.trim().toUpperCase()))
      return 'Enter your Cal-T permit number as shown on your permit (letters, numbers and dashes, 4–20 characters).';
    if (!insurance) return 'Enter the date your cargo and liability insurance expires.';
    if (insurance < todayISO()) return 'That insurance date has passed. Enter the expiry date of your current policy.';
    if (!/^[A-Z]{2,4}$/.test(prefix.trim().toUpperCase())) return 'Use 2 to 4 letters for your job number prefix, like RV.';
    return null;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const problem = validate();
    setError(problem);
    if (problem) return;
    setBusy(true);
    const { error: rpcError } = await callRpc(createClient(), 'create_company', {
      p_name: name.trim(),
      p_city: city.trim(),
      p_permit_number: permit.trim().toUpperCase(),
      p_insurance_expires: insurance,
      p_job_prefix: prefix.trim().toUpperCase(),
    });
    if (rpcError) {
      setBusy(false);
      setError(friendlyError(rpcError));
      return;
    }
    router.replace('/verifying');
    router.refresh();
  }

  const example = (prefix.trim().toUpperCase() || 'RV') + '-1000';

  return (
    <form onSubmit={onSubmit}>
      <div className="fields">
        <div className="field">
          <label htmlFor="name">Company name</label>
          <input id="name" required maxLength={120} autoComplete="organization" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="city">City</label>
          <input id="city" required maxLength={80} autoComplete="address-level2" placeholder="Petaluma" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
      </div>
      <div className="fields">
        <div className="field">
          <label htmlFor="permit">Cal-T permit number</label>
          <input
            id="permit" required maxLength={20} placeholder="MTR0190412" aria-describedby="permit-hint"
            value={permit} onChange={(e) => setPermit(e.target.value.toUpperCase())} className="mono"
          />
          <span className="hint" id="permit-hint">Your household goods carrier permit (BHGS). It&apos;s public record.</span>
        </div>
        <div className="field">
          <label htmlFor="insurance">Insurance expires</label>
          <input id="insurance" type="date" required min={todayISO()} value={insurance} onChange={(e) => setInsurance(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="prefix">Job number prefix</label>
          <input
            id="prefix" required maxLength={4} placeholder="RV" aria-describedby="prefix-hint" className="mono"
            value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
          />
          <span className="hint" id="prefix-hint">2–4 letters. Your jobs will be numbered like {example}.</span>
        </div>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="row">
        <button type="submit" className="btn" disabled={busy}>{busy ? 'Saving…' : 'Submit for verification'}</button>
        <span className="hint">You can&apos;t change the permit number or insurance date yourself later. Contact LiftCrew to update them.</span>
      </div>
    </form>
  );
}
