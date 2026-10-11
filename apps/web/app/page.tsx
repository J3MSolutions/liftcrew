import { redirect } from 'next/navigation';
import { getViewer, homeFor } from '@/lib/auth';

export default async function Home() {
  redirect(homeFor(await getViewer()));
}
