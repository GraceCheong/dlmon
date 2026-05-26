import { requireUserOrRedirect } from '@/lib/auth-helpers';
import MarketplaceClient from '@/components/dashboard/MarketplaceClient';

export default async function MarketplacePage() {
  await requireUserOrRedirect();
  return <MarketplaceClient />;
}
