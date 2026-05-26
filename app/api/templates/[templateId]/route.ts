import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

export async function GET(_req: Request, { params }: { params: Promise<{ templateId: string }> }) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { templateId } = await params;

  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (!template || template.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ template });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ templateId: string }> }) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { templateId } = await params;

  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (!template || template.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updated = await prisma.template.update({
    where: { id: templateId },
    data: {
      ...(typeof body.title === 'string' && { title: body.title.trim() }),
      ...(body.description !== undefined && { description: body.description as string | null }),
      ...(body.content !== undefined && {
        content: typeof body.content === 'string' ? body.content : JSON.stringify(body.content),
      }),
      ...(body.targetAudience !== undefined && { targetAudience: body.targetAudience as string | null }),
      ...(body.hskLevel !== undefined && { hskLevel: body.hskLevel as string | null }),
    },
  });
  return NextResponse.json({ template: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ templateId: string }> }) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { templateId } = await params;

  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (!template || template.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const hasListing = await prisma.marketplaceTemplate.findFirst({
    where: { templateId, isActive: true },
  });
  if (hasListing) {
    return NextResponse.json({ error: 'Unpublish from marketplace before deleting' }, { status: 409 });
  }

  await prisma.marketplaceTemplate.deleteMany({ where: { templateId } });
  await prisma.template.delete({ where: { id: templateId } });
  return NextResponse.json({ ok: true });
}
