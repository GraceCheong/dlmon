import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

export async function GET(_req: Request, { params }: { params: Promise<{ marketplaceTemplateId: string }> }) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const { marketplaceTemplateId } = await params;

  const listing = await prisma.marketplaceTemplate.findUnique({
    where: { id: marketplaceTemplateId, isActive: true },
    include: { publisher: { select: { name: true, displayName: true } } },
  });
  if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ listing });
}
