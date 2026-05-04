import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;
  
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId }
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const newStatus = lesson.status === 'published' ? 'draft' : 'published';
    
    // Generate slug if it doesn't exist - use timestamp to avoid Korean/Chinese stripping issues
    let slug = lesson.slug;
    if (!slug) {
      const base = lesson.title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\u4e00-\u9fa5\u3040-\u30ff-]/g, '')
        .substring(0, 40);
      slug = `${base || 'lesson'}-${Date.now().toString(36)}`;
    }

    const updatedLesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        status: newStatus,
        slug: slug,
        publishedAt: newStatus === 'published' ? new Date() : null
      }
    });

    return NextResponse.json(updatedLesson);
  } catch (error) {
    console.error('Publish error:', error);
    return NextResponse.json({ error: 'Failed to update publication status' }, { status: 500 });
  }
}
