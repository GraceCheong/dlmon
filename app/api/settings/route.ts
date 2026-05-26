import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

const AI_PROVIDERS = ['ollama', 'claude-cli'] as const;

export async function GET() {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      displayName: true,
      email: true,
      language: true,
      aiMode: true,
      aiProvider: true,
    },
  });

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ settings: user });
}

export async function PATCH(request: Request) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  let body: { displayName?: string; email?: string; language?: string; aiMode?: boolean; aiProvider?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.displayName === 'string') data.displayName = body.displayName.trim() || null;
  if (typeof body.email === 'string' && body.email.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }
    data.email = body.email.trim();
  }
  if (body.language === 'ko' || body.language === 'en') data.language = body.language;
  if (typeof body.aiMode === 'boolean') data.aiMode = body.aiMode;
  if (typeof body.aiProvider === 'string' && AI_PROVIDERS.includes(body.aiProvider as typeof AI_PROVIDERS[number])) {
    data.aiProvider = body.aiProvider;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        displayName: true,
        email: true,
        language: true,
        aiMode: true,
        aiProvider: true,
      },
    });
    return NextResponse.json({ settings: updated });
  } catch (e) {
    if ((e as { code?: string })?.code === 'P2002') {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
