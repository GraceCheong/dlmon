import { requireUserOrRedirect } from '@/lib/auth-helpers';
import TextbookTemplateClient from '@/components/dashboard/TextbookTemplateClient';

export default async function TextbookTemplatesPage() {
  await requireUserOrRedirect();
  return <TextbookTemplateClient />;
}
