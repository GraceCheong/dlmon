import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

/**
 * Save (upsert) the syllabus markdown content for a course owned by the
 * current user.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { courseId } = await params;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: { content?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body.content !== 'string') {
    return NextResponse.json({ error: '`content` must be a string' }, { status: 400 });
  }

  await prisma.syllabus.upsert({
    where: { courseId },
    update: { content: body.content },
    create: { courseId, content: body.content },
  });

  return NextResponse.json({ ok: true });
}
