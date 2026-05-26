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

  await prisma.marketplaceTemplate.updateMany({
    where: { templateId, isActive: true },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
