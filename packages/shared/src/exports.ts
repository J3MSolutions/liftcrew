// Pay-record exports for bookkeeping and payroll. Pure functions: rows in, file text out.
// Research notes (Oct 2026):
//  - QuickBooks Online (Canada/UK) imports journal entries from CSV with columns
//    Journal No., Journal Date, Account Name, Debits, Credits, Description, Name.
//    US QuickBooks Online needs an import app for this; a direct API connection is the long-term answer.
//  - QuickBooks Desktop imports General Journal transactions from IIF (tab-separated TRNS/SPL/ENDTRNS).
//  - Xero's manual journal import uses Narration, Date, Description, AccountCode, TaxRate, Amount.
//  - Gusto's payroll import maps spreadsheet columns itself; one row per employee per work date is safest.

export type ExportFormat = 'csv' | 'payroll' | 'qbo' | 'iif' | 'xero';

export interface PayRecordRow {
  date: string;          // YYYY-MM-DD
  jobNumber: string;
  route: string;
  mover: string;         // full name
  type: 'Wages' | 'Standby';
  hours: number;
  rate: number;
  wages: number;
  standby: number;
  tip: number;
  status: 'Paid' | 'Due';
}

export interface ExportAccounts {
  expenseAccount: string;     // QuickBooks account names
  tipsAccount: string;
  liabilityAccount: string;
  xeroExpenseCode: string;    // Xero account codes
  xeroLiabilityCode: string;
}

export const DEFAULT_ACCOUNTS: ExportAccounts = {
  expenseAccount: 'Payroll Expenses:Wages',
  tipsAccount: 'Payroll Expenses:Tips',
  liabilityAccount: 'Payroll Liabilities:Accrued Wages',
  xeroExpenseCode: '477',
  xeroLiabilityCode: '814',
};

export const EXPORT_FORMATS: { key: ExportFormat; label: string; extension: string; description: string; journal: boolean }[] = [
  { key: 'csv', label: 'CSV spreadsheet', extension: 'csv', journal: false,
    description: 'Every pay record. Opens in Excel, Google Sheets, Numbers and most bookkeeping tools.' },
  { key: 'payroll', label: 'Payroll hours (Gusto and similar)', extension: 'csv', journal: false,
    description: 'One row per mover per job with hours, rate, tips and standby pay, to upload when you run payroll.' },
  { key: 'qbo', label: 'QuickBooks Online journal entry', extension: 'csv', journal: true,
    description: 'Labor cost by job. Imports directly in Canada and the UK; US QuickBooks Online needs an import app.' },
  { key: 'iif', label: 'QuickBooks Desktop (IIF)', extension: 'iif', journal: true,
    description: 'General journal entries for File › Utilities › Import › IIF Files.' },
  { key: 'xero', label: 'Xero manual journal', extension: 'csv', journal: true,
    description: "Matches Xero's manual journal import columns. Uses account codes." },
];

const n2 = (v: number) => (Math.round(v * 100) / 100).toFixed(2);

/** "2026-10-03" -> "10/03/2026" */
export const mdy = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split('-'); return `${m}/${d}/${y}`; };

/** CSV cell quoting, with a guard against spreadsheet formula injection. */
export function csvCell(v: unknown): string {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
export const toCSV = (rows: unknown[][]) => rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';

function byJob(rows: PayRecordRow[]): PayRecordRow[][] {
  const groups = new Map<string, PayRecordRow[]>();
  for (const r of rows) groups.set(r.jobNumber, [...(groups.get(r.jobNumber) ?? []), r]);
  return [...groups.values()];
}

/** IIF is tab-separated and older QuickBooks Desktop versions mis-read non-ASCII text. */
const iifClean = (s: string) =>
  s.replace(/[\t\r\n]/g, ' ').replace(/→/g, 'to').replace(/·/g, '-').replace(/[^\x20-\x7E]/g, '');

export const CSV_HEADER = ['Date', 'Job', 'Route', 'Mover', 'Type', 'Hours', 'Hourly rate', 'Wages', 'Standby pay', 'Tip', 'Total', 'Status'];

export function buildExport(format: ExportFormat, rows: PayRecordRow[], companyName: string, accounts: ExportAccounts = DEFAULT_ACCOUNTS): string {
  const a = accounts;
  switch (format) {
    case 'csv':
      return toCSV([CSV_HEADER, ...rows.map((r) => [
        r.date, r.jobNumber, r.route, r.mover, r.type, r.hours, n2(r.rate), n2(r.wages), n2(r.standby), n2(r.tip),
        n2(r.wages + r.standby + r.tip), r.status])]);

    case 'payroll':
      return toCSV([
        ['First name', 'Last name', 'Work date', 'Job', 'Regular hours', 'Hourly rate', 'Gross wages', 'Paycheck tips', 'Standby pay'],
        ...rows.map((r) => {
          const [first, ...rest] = r.mover.trim().split(/\s+/);
          return [first, rest.join(' '), r.date, r.jobNumber, r.hours, n2(r.rate), n2(r.wages), n2(r.tip), n2(r.standby)];
        })]);

    case 'qbo': {
      const out: unknown[][] = [['Journal No.', 'Journal Date', 'Account Name', 'Debits', 'Credits', 'Description', 'Name']];
      for (const g of byJob(rows)) {
        let total = 0;
        for (const r of g) {
          const labor = r.wages + r.standby;
          if (labor) { out.push([r.jobNumber, mdy(r.date), a.expenseAccount, n2(labor), '', `${r.type} - ${r.route}${r.hours ? ` - ${r.hours} hrs` : ''}`, r.mover]); total += labor; }
          if (r.tip) { out.push([r.jobNumber, mdy(r.date), a.tipsAccount, n2(r.tip), '', `Tip - ${r.route}`, r.mover]); total += r.tip; }
        }
        if (total) out.push([g[0]!.jobNumber, mdy(g[0]!.date), a.liabilityAccount, '', n2(total), `Crew labor owed - ${g[0]!.route}`, '']);
      }
      return toCSV(out);
    }

    case 'iif': {
      const lines = [
        '!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO',
        '!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO',
        '!ENDTRNS',
      ];
      for (const g of byJob(rows)) {
        const total = g.reduce((s, r) => s + r.wages + r.standby + r.tip, 0);
        if (!total) continue;
        const first = g[0]!;
        lines.push(['TRNS', 'GENERAL JOURNAL', mdy(first.date), iifClean(a.liabilityAccount), '', n2(-total), iifClean(first.jobNumber),
          iifClean(`Crew labor owed - ${first.route}`)].join('\t'));
        for (const r of g) {
          const labor = r.wages + r.standby;
          // NAME is left blank: QuickBooks rejects names that aren't already in its lists. The mover goes in MEMO.
          if (labor) lines.push(['SPL', 'GENERAL JOURNAL', mdy(r.date), iifClean(a.expenseAccount), '', n2(labor), iifClean(r.jobNumber),
            iifClean(`${r.mover} - ${r.type}${r.hours ? ` - ${r.hours} hrs` : ''}`)].join('\t'));
          if (r.tip) lines.push(['SPL', 'GENERAL JOURNAL', mdy(r.date), iifClean(a.tipsAccount), '', n2(r.tip), iifClean(r.jobNumber),
            iifClean(`${r.mover} - Tip`)].join('\t'));
        }
        lines.push('ENDTRNS');
      }
      return lines.join('\r\n') + '\r\n';
    }

    case 'xero': {
      const out: unknown[][] = [['*Narration', '*Date', 'Description', '*AccountCode', '*TaxRate', '*Amount']];
      for (const g of byJob(rows)) {
        const narration = `${companyName} crew labor ${g[0]!.jobNumber}`;
        let total = 0;
        for (const r of g) {
          const amt = r.wages + r.standby + r.tip;
          if (!amt) continue;
          out.push([narration, mdy(r.date), `${r.mover} - ${r.type}${r.tip ? ' + tip' : ''}`, a.xeroExpenseCode, 'Tax Exempt', n2(amt)]);
          total += amt;
        }
        if (total) out.push([narration, mdy(g[0]!.date), 'Crew labor owed', a.xeroLiabilityCode, 'Tax Exempt', n2(-total)]);
      }
      return toCSV(out);
    }
  }
}

export function exportFilename(format: ExportFormat, jobPrefix: string, label: string): string {
  const f = EXPORT_FORMATS.find((x) => x.key === format)!;
  const safe = label.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  return `${jobPrefix.toLowerCase()}-pay-${safe}-${format}.${f.extension}`;
}
