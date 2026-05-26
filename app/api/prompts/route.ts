import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

export async function GET() {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const prompts = await prisma.prompt.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, content: true, targetAudience: true, hskLevel: true, updatedAt: true },
  });
  return NextResponse.json({ prompts });
}

export async function POST(request: Request) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { title, content, targetAudience, hskLevel } = body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: '`title` is required' }, { status: 400 });
  }
  if (!content || typeof content !== 'string' || !content.trim()) {
    return NextResponse.json({ error: '`content` is required' }, { status: 400 });
  }

  const prompt = await prisma.prompt.create({
    data: {
      userId,
      title: String(title).trim(),
      content: String(content).trim(),
      targetAudience: typeof targetAudience === 'string' ? targetAudience : null,
      hskLevel: typeof hskLevel === 'string' ? hskLevel : null,
    },
  });
  return NextResponse.json({ prompt }, { status: 201 });
}
