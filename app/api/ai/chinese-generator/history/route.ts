import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

export async function GET() {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const items = await prisma.generatedItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true, mode: true, topic: true, hskLevel: true,
      targetAudience: true, count: true, grammarPattern: true,
      context: true, content: true, createdAt: true,
    },
  });

  return NextResponse.json({ items });
}
