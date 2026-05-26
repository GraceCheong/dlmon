import { requireUserOrRedirect } from '@/lib/auth-helpers';
import ChineseGeneratorClient from '@/components/dashboard/ChineseGeneratorClient';

export default async function ChineseGeneratorPage() {
  await requireUserOrRedirect();
  return <ChineseGeneratorClient />;
}
