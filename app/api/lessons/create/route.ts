import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

export async function POST(request: Request) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  try {
    const body = await request.json();
    const { courseId, title, order } = body;

    if (!courseId || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.userId !== userId) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const lessonOrder = order || 1;

    // Idempotency: return existing lesson if same courseId+order already exists
    const existing = await prisma.lesson.findFirst({
      where: { courseId, order: lessonOrder },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) {
      return NextResponse.json(existing);
    }

    const slug = `${title.toLowerCase().replace(/ /g, '-')}-${uuidv4().substring(0, 8)}`;

    const lesson = await prisma.lesson.create({
      data: {
        courseId,
        title,
        order: lessonOrder,
        slug,
        status: 'draft',
      },
    });

    return NextResponse.json(lesson);
  } catch (error) {
    console.error('Lesson creation error:', error);
    return NextResponse.json({ error: 'Failed to create lesson' }, { status: 500 });
  }
}
