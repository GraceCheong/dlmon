import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';
import { defaultModel } from '@/lib/ai/client';

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

  const { mode, topic, hskLevel, targetAudience, count, grammarPattern, context, items } = body;

  if (!mode || !topic || !Array.isArray(items)) {
    return NextResponse.json({ error: 'mode, topic, and items are required' }, { status: 400 });
  }

  const item = await prisma.generatedItem.create({
    data: {
      userId,
      mode: String(mode),
      topic: String(topic),
      hskLevel: typeof hskLevel === 'string' ? hskLevel : null,
      targetAudience: typeof targetAudience === 'string' ? targetAudience : null,
      count: typeof count === 'number' ? count : items.length,
      grammarPattern: typeof grammarPattern === 'string' ? grammarPattern : null,
      context: typeof context === 'string' ? context : null,
      content: JSON.stringify(items),
      aiProvider: 'local-openai-compatible',
      aiModel: defaultModel,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
