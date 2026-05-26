import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';
import { defaultModel } from '@/lib/ai/client';

export async function GET() {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const plans = await prisma.lessonPlan.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, targetAudience: true, hskLevel: true, updatedAt: true, createdAt: true },
  });
  return NextResponse.json({ plans });
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

  const { title, content, targetAudience, hskLevel, promptId } = body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: '`title` is required' }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: '`content` is required' }, { status: 400 });
  }

  if (promptId && typeof promptId === 'string') {
    const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
    if (!prompt || prompt.userId !== userId) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }
  }

  const plan = await prisma.lessonPlan.create({
    data: {
      userId,
      title: String(title).trim(),
      content: typeof content === 'string' ? content : JSON.stringify(content),
      targetAudience: typeof targetAudience === 'string' ? targetAudience : null,
      hskLevel: typeof hskLevel === 'string' ? hskLevel : null,
      promptId: typeof promptId === 'string' ? promptId : null,
      aiProvider: 'local-openai-compatible',
      aiModel: defaultModel,
    },
  });
  return NextResponse.json({ plan }, { status: 201 });
}
