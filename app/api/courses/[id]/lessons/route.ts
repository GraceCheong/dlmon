import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      lessons: {
        orderBy: { order: 'asc' },
        include: {
          blocks: { orderBy: { order: 'asc' } },
        },
      },
    },
  });

  if (!course || course.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    course: {
      id: course.id,
      title: course.title,
      description: course.description ?? null,
      level: course.level,
      type: course.type,
      lessons: course.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        order: lesson.order,
        blocks: lesson.blocks.map((block) => {
          let summary = '';
          try {
            const parsed = JSON.parse(block.content);
            // Extract meaningful text for the summary
            if (block.type === 'heading' || block.type === 'text') {
              summary = typeof parsed.text === 'string' ? parsed.text.slice(0, 120) : '';
            } else if (block.type === 'youtube-link' || block.type === 'video') {
              summary = parsed.title || parsed.url || '';
            } else if (block.type === 'image') {
              summary = parsed.caption || parsed.alt || '';
            } else if (block.type === 'quiz') {
              summary = typeof parsed.question === 'string' ? parsed.question.slice(0, 80) : '';
            } else if (block.type === 'file-attachment') {
              summary = parsed.name || '';
            }
          } catch {
            // ignore parse errors
          }
          return { id: block.id, type: block.type, summary };
        }),
      })),
    },
  });
}
