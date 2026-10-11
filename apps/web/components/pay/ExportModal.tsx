'use client';

import { buildExport, COPY, DEFAULT_ACCOUNTS, EXPORT_FORMATS, exportFilename } from '@liftcrew/shared';
import type { ExportAccounts, ExportFormat } from '@liftcrew/shared';
import { useMemo, useState } from 'react';
import { toPayRecordRows } from '@/lib/pay-rows';
import type { PayLine } from '@/lib/types';
import { Modal } from '../Modal';
import { useToast } from '../Toast';

type Range = 'all' | 'this' | 'last' | 'custom';
type Include = 'both' | 'paid' | 'due';

/** "2026-10" for this month or last month, from today's YYYY-MM-DD. */
function monthOf(today: string, back: number): string {
  const [y, m] = today.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 - back, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1, 1, 12)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

const ACCOUNT_FIELDS: Record<'qbo' | 'iif' | 'xero', { key: keyof ExportAccounts; label: string }[]> = {
  qbo: [
    { key: 'expenseAccount', label: 'Wages expense account' },
    { key: 'tipsAccount', label: 'Tips account' },
    { key: 'liabilityAccount', label: 'Wages owed (liability) account' },
  ],
  iif: [
    { key: 'expenseAccount', label: 'Wages expense account' },
    { key: 'tipsAccount', label: 'Tips account' },
    { key: 'liabilityAccount', label: 'Wages owed (liability) account' },
  ],
  xero: [
    { key: 'xeroExpenseCode', label: 'Wages expense account code' },
    { key: 'xeroLiabilityCode', label: 'Wages payable account code' },
  ],
};

export function ExportModal({ lines, companyName, jobPrefix, today, onClose }: {
  lines: PayLine[];
  companyName: string;
  jobPrefix: string;
  today: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [range, setRange] = useState<Range>('all');
  const [custom, setCustom] = useState(monthOf(today, 0));
  const [include, setInclude] = useState<Include>('both');
  const [accounts, setAccounts] = useState<ExportAccounts>(DEFAULT_ACCOUNTS);

  const fmt = EXPORT_FORMATS.find((f) => f.key === format) ?? EXPORT_FORMATS[0]!;
  const month = range === 'this' ? monthOf(today, 0) : range === 'last' ? monthOf(today, 1) : range === 'custom' ? custom : null;
  const label = month ?? 'all';

  const rows = useMemo(() => {
    const picked = lines.filter(
      (l) => (!month || l.date.startsWith(month)) && (include === 'both' || l.pay === include),
    );
    // Oldest first reads naturally in a ledger.
    return toPayRecordRows(picked).sort((a, b) => a.date.localeCompare(b.date) || a.jobNumber.localeCompare(b.jobNumber));
  }, [lines, month, include]);

  const text = useMemo(() => buildExport(format, rows, companyName, accounts), [format, rows, companyName, accounts]);
  const preview = text.split(/\r?\n/).slice(0, 9).join('\n');
  const filename = exportFilename(format, jobPrefix, label);

  function download() {
    const type = format === 'iif' ? 'text/plain;charset=utf-8' : 'text/csv;charset=utf-8';
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Downloaded ${filename}.`);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied. Paste it into a spreadsheet or a text file.');
    } catch {
      toast("Couldn't copy here. Select the preview text and copy it instead.", 'bad');
    }
  }

  const accountFields = fmt.journal ? ACCOUNT_FIELDS[format as 'qbo' | 'iif' | 'xero'] : null;

  return (
    <Modal title="Export pay records" subtitle={companyName} onClose={onClose}>
      <fieldset className="plain-fieldset">
        <legend className="qlabel">Format</legend>
        <div className="crew" style={{ marginTop: 6 }}>
          {EXPORT_FORMATS.map((f) => (
            <label key={f.key} className="crew-row format-option">
              <span className="who-line">
                <input type="radio" name="export-format" value={f.key} checked={format === f.key} onChange={() => setFormat(f.key)} />
                <span>
                  <b>{f.label}</b>
                  <span className="muted small" style={{ display: 'block' }}>{f.description}</span>
                </span>
              </span>
              <span className={`pill ${format === f.key ? 'info' : 'plain'}`}>.{f.extension}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="fields">
        <div className="field">
          <label htmlFor="ex-range">Dates</label>
          <select id="ex-range" value={range} onChange={(e) => setRange(e.target.value as Range)}>
            <option value="all">All records</option>
            <option value="this">This month ({monthLabel(monthOf(today, 0))})</option>
            <option value="last">Last month ({monthLabel(monthOf(today, 1))})</option>
            <option value="custom">Pick a month</option>
          </select>
        </div>
        {range === 'custom' ? (
          <div className="field">
            <label htmlFor="ex-month">Month</label>
            <input id="ex-month" type="month" max={monthOf(today, 0)} value={custom} onChange={(e) => setCustom(e.target.value || monthOf(today, 0))} />
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="ex-include">Include</label>
          <select id="ex-include" value={include} onChange={(e) => setInclude(e.target.value as Include)}>
            <option value="both">Paid and due</option>
            <option value="paid">Paid only</option>
            <option value="due">Due only</option>
          </select>
        </div>
      </div>

      {accountFields ? (
        <>
          <div className="fields">
            {accountFields.map((af) => (
              <div className="field" key={af.key}>
                <label htmlFor={`ex-${af.key}`}>{af.label}</label>
                <input
                  id={`ex-${af.key}`} value={accounts[af.key]} maxLength={120}
                  onChange={(e) => setAccounts((a) => ({ ...a, [af.key]: e.target.value }))}
                  onBlur={(e) => { if (!e.target.value.trim()) setAccounts((a) => ({ ...a, [af.key]: DEFAULT_ACCOUNTS[af.key] })); }}
                />
              </div>
            ))}
          </div>
          <p className="hint">
            Use your own account {format === 'xero' ? 'codes' : 'names'} exactly as they appear in your chart of accounts. {COPY.doubleCount}
          </p>
        </>
      ) : null}

      <div>
        <div className="qlabel" id="ex-preview-label">Preview · {rows.length} record{rows.length === 1 ? '' : 's'}</div>
        <pre className="mono preview" aria-labelledby="ex-preview-label" tabIndex={0}>
          {rows.length ? preview : 'No records match these filters.'}
        </pre>
      </div>

      <div className="row end">
        <button type="button" className="btn quiet" onClick={copy} disabled={!rows.length}>Copy</button>
        <button type="button" className="btn" onClick={download} disabled={!rows.length}>Download .{fmt.extension}</button>
      </div>
    </Modal>
  );
}
