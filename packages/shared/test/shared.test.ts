import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExport, containsSensitiveNumber, csvCell, fmtDate, fmtTime, mdy, todayISO, weekdayOf, type PayRecordRow,
} from '../src/index';

const rows: PayRecordRow[] = [
  { date: '2026-10-03', jobNumber: 'RV-1039', route: 'Petaluma → Sonoma', mover: 'Marcus Reyes', type: 'Wages', hours: 7, rate: 30, wages: 210, standby: 0, tip: 50, status: 'Paid' },
  { date: '2026-10-03', jobNumber: 'RV-1039', route: 'Petaluma → Sonoma', mover: 'Kevin Pham', type: 'Wages', hours: 7, rate: 30, wages: 210, standby: 0, tip: 0, status: 'Due' },
  { date: '2026-10-03', jobNumber: 'RV-1039', route: 'Petaluma → Sonoma', mover: 'Ray Delgado', type: 'Standby', hours: 0, rate: 0, wages: 0, standby: 25, tip: 0, status: 'Due' },
];

test('sensitive numbers match the database rules', () => {
  assert.ok(containsSensitiveNumber('SSN 123-45-6789'));
  assert.ok(containsSensitiveNumber('acct 123456789'));
  assert.ok(containsSensitiveNumber('4111 1111 1111 1111'));
  assert.ok(!containsSensitiveNumber('Call (707) 555-0148 after 5'));
  assert.ok(!containsSensitiveNumber('Moved 3 couches on 10/03/2026, 6.5 hrs'));
});

test('date helpers', () => {
  assert.equal(fmtDate('2026-10-17'), 'Sat, Oct 17');
  assert.equal(weekdayOf('2026-10-17'), 'Sat');
  assert.equal(fmtTime('08:00:00'), '8:00 AM');
  assert.equal(fmtTime('13:30'), '1:30 PM');
  assert.equal(mdy('2026-10-03'), '10/03/2026');
  assert.equal(todayISO(new Date('2026-10-11T05:00:00Z')), '2026-10-10'); // still Oct 10 in California
});

test('CSV cells are quoted and protected from formula injection', () => {
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell('-25.00'), '-25.00');
});

test('QuickBooks Online journal balances per job', () => {
  const lines = buildExport('qbo', rows, 'Redwood Valley Movers').trim().split('\r\n').slice(1);
  let debits = 0, credits = 0;
  for (const l of lines) {
    const cells = l.split(',');
    debits += Number(cells[3] || 0); credits += Number(cells[4] || 0);
  }
  assert.equal(debits.toFixed(2), credits.toFixed(2));
  assert.equal(credits, 495);
});

test('IIF transaction sums to zero and is ASCII only', () => {
  const text = buildExport('iif', rows, 'Redwood Valley Movers');
  assert.ok(/^[\x09\x0A\x0D\x20-\x7E]*$/.test(text));
  const amounts = text.split('\r\n').filter((l) => /^(TRNS|SPL)\t/.test(l)).map((l) => Number(l.split('\t')[5]));
  assert.equal(amounts.reduce((a, b) => a + b, 0).toFixed(2), '0.00');
});

test('Xero journal nets to zero', () => {
  const lines = buildExport('xero', rows, 'Redwood Valley Movers').trim().split('\r\n').slice(1);
  const total = lines.map((l) => Number(l.split(',').at(-1))).reduce((a, b) => a + b, 0);
  assert.equal(total.toFixed(2), '0.00');
});

test('payroll file splits names and keeps tips separate', () => {
  const lines = buildExport('payroll', rows, 'x').trim().split('\r\n');
  assert.equal(lines[1], 'Marcus,Reyes,2026-10-03,RV-1039,7,30.00,210.00,50.00,0.00');
});
