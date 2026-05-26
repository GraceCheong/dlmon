import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

export async function GET() {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const files = await prisma.uploadedFile.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, originalName: true, fileType: true, fileSize: true,
      conversionStatus: true, description: true, createdAt: true,
    },
  });
  return NextResponse.json({ files });
}
