import prisma from '@/lib/prisma';
import { requireUserOrRedirect } from '@/lib/auth-helpers';
import TemplatesClient from '@/components/dashboard/TemplatesClient';

export default async function TemplatesPage() {
  const userId = await requireUserOrRedirect();

  const [templates, publishedIds] = await Promise.all([
    prisma.template.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, description: true, type: true, targetAudience: true, hskLevel: true, sourceType: true, updatedAt: true },
    }),
    prisma.marketplaceTemplate.findMany({
      where: { publisherId: userId, isActive: true },
      select: { templateId: true },
    }),
  ]);

  const publishedSet = new Set(publishedIds.map(p => p.templateId));
  const templatesWithPublished = templates.map(t => ({
    ...t,
    description: t.description ?? null,
    targetAudience: t.targetAudience ?? null,
    hskLevel: t.hskLevel ?? null,
    updatedAt: t.updatedAt.toISOString(),
    isPublished: publishedSet.has(t.id),
  }));

  return <TemplatesClient initialTemplates={templatesWithPublished} />;
}
