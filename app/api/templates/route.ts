import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

export async function GET() {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const templates = await prisma.template.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, description: true, type: true, targetAudience: true, hskLevel: true, sourceType: true, updatedAt: true },
  });
  return NextResponse.json({ templates });
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

  const { title, description, type, content, targetAudience, hskLevel, sourceType, textbookRef } = body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: '`title` is required' }, { status: 400 });
  }

  const template = await prisma.template.create({
    data: {
      userId,
      title: String(title).trim(),
      description: typeof description === 'string' ? description : null,
      type: typeof type === 'string' ? type : 'lesson',
      content: content ? (typeof content === 'string' ? content : JSON.stringify(content)) : '{}',
      targetAudience: typeof targetAudience === 'string' ? targetAudience : null,
      hskLevel: typeof hskLevel === 'string' ? hskLevel : null,
      sourceType: typeof sourceType === 'string' ? sourceType : 'manual',
      textbookRef: typeof textbookRef === 'string' ? textbookRef : null,
    },
  });
  return NextResponse.json({ template }, { status: 201 });
}
