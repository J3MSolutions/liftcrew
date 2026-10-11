import { COPY, fmtDate, todayISO } from '@liftcrew/shared';
import type { Metadata } from 'next';
import { SettingsForm } from '@/components/SettingsForm';
import { requireCompany } from '@/lib/auth';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const { company: c } = await requireCompany();
  const lapsed = c.insurance_expires < todayISO();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="muted">Your company details as movers see them on jobs.</p>
        </div>
      </div>
      <SettingsForm
        company={{
          id: c.id, name: c.name, city: c.city,
          payroll_portal_name: c.payroll_portal_name, payroll_portal_url: c.payroll_portal_url,
        }}
      />

      <h2 className="section-label">Verified by LiftCrew</h2>
      <div className="form">
        <div className="readonly-box">
          <div className="line"><span className="muted">Cal-T permit</span><span className="mono">{c.permit_number}</span></div>
          <div className="line">
            <span className="muted">Insurance expires</span>
            <span>{fmtDate(c.insurance_expires)}{lapsed ? <> <span className="pill bad">Expired</span></> : null}</span>
          </div>
          <div className="line"><span className="muted">Job numbers</span><span className="mono">{c.job_prefix}-####</span></div>
        </div>
        <p className="hint">Contact LiftCrew to change these. We re-check your permit and insurance before updating them.</p>
      </div>

      <h2 className="section-label">Hiring</h2>
      <p className="hint" style={{ maxWidth: '70ch' }}>{COPY.employerModel}</p>
    </>
  );
}
