import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

export async function GET() {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const courses = await prisma.course.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      level: true,
      type: true,
      updatedAt: true,
      _count: { select: { lessons: true } },
    },
  });

  return NextResponse.json({
    courses: courses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description ?? null,
      level: c.level,
      type: c.type,
      lessonCount: c._count.lessons,
      updatedAt: c.updatedAt.toISOString(),
    })),
  });
}
