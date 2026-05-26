import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

export async function POST(_req: Request, { params }: { params: Promise<{ templateId: string }> }) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { templateId } = await params;

  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (!template || template.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Deactivate any existing listing for this template (unpublish old snapshot).
  await prisma.marketplaceTemplate.updateMany({
    where: { templateId, isActive: true },
    data: { isActive: false },
  });

  // Create a new marketplace entry with a fresh publish-time snapshot.
  const listing = await prisma.marketplaceTemplate.create({
    data: {
      templateId,
      publisherId: userId,
      title: template.title,
      description: template.description,
      targetAudience: template.targetAudience,
      hskLevel: template.hskLevel,
      type: template.type,
      snapshot: template.content, // immutable copy at publish time
      isActive: true,
    },
  });

  return NextResponse.json({ listing }, { status: 201 });
}
