import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

export async function POST(_req: Request, { params }: { params: Promise<{ marketplaceTemplateId: string }> }) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { marketplaceTemplateId } = await params;

  const listing = await prisma.marketplaceTemplate.findUnique({
    where: { id: marketplaceTemplateId, isActive: true },
  });
  if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Copied templates become independent private templates.
  const copied = await prisma.$transaction(async (tx) => {
    const template = await tx.template.create({
      data: {
        userId,
        title: `${listing.title} (복사본)`,
        description: listing.description,
        type: listing.type,
        content: listing.snapshot, // copied from publish-time snapshot
        targetAudience: listing.targetAudience,
        hskLevel: listing.hskLevel,
        sourceType: 'copied',
      },
    });
    await tx.marketplaceTemplate.update({
      where: { id: marketplaceTemplateId },
      data: { copyCount: { increment: 1 } },
    });
    return template;
  });

  return NextResponse.json({ template: copied }, { status: 201 });
}
