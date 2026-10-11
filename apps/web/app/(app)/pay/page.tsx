import { todayISO } from '@liftcrew/shared';
import type { Metadata } from 'next';
import { PayView } from '@/components/pay/PayView';
import { requireCompany } from '@/lib/auth';
import { getPayData } from '@/lib/pay';

export const metadata: Metadata = { title: 'Pay records' };

export default async function PayPage() {
  const { company } = await requireCompany();
  const { lines, fees } = await getPayData(company.id);
  return <PayView lines={lines} fees={fees} companyName={company.name} jobPrefix={company.job_prefix} today={todayISO()} />;
}
