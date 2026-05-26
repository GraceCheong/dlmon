import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

export async function GET(_req: Request, { params }: { params: Promise<{ promptId: string }> }) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { promptId } = await params;

  const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
  if (!prompt || prompt.userId !== userId) {
    return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
  }
  return NextResponse.json({ prompt });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ promptId: string }> }) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { promptId } = await params;

  const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
  if (!prompt || prompt.userId !== userId) {
    return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updated = await prisma.prompt.update({
    where: { id: promptId },
    data: {
      ...(typeof body.title === 'string' && { title: body.title.trim() }),
      ...(typeof body.content === 'string' && { content: body.content.trim() }),
      ...(body.targetAudience !== undefined && { targetAudience: body.targetAudience as string | null }),
      ...(body.hskLevel !== undefined && { hskLevel: body.hskLevel as string | null }),
    },
  });
  return NextResponse.json({ prompt: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ promptId: string }> }) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { promptId } = await params;

  const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
  if (!prompt || prompt.userId !== userId) {
    return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
  }

  await prisma.prompt.delete({ where: { id: promptId } });
  return NextResponse.json({ ok: true });
}
