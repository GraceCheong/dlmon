import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() || '';
  const audience = searchParams.get('audience') || '';
  const hskLevel = searchParams.get('hskLevel') || '';
  const type = searchParams.get('type') || '';

  const listings = await prisma.marketplaceTemplate.findMany({
    where: {
      isActive: true,
      ...(q && {
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
        ],
      }),
      ...(audience && { targetAudience: audience }),
      ...(hskLevel && { hskLevel }),
      ...(type && { type }),
    },
    orderBy: [{ copyCount: 'desc' }, { publishedAt: 'desc' }],
    include: {
      publisher: { select: { name: true, displayName: true } },
    },
    take: 50,
  });

  return NextResponse.json({ listings });
}
