import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courseId, title, order } = body;

    if (!courseId || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Generate unique slug
    const slug = `${title.toLowerCase().replace(/ /g, '-')}-${uuidv4().substring(0, 8)}`;

    const lesson = await prisma.lesson.create({
      data: {
        courseId,
        title,
        order: order || 1,
        slug,
        status: 'draft'
      }
    });

    return NextResponse.json(lesson);
  } catch (error) {
    console.error('Lesson creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create lesson' },
      { status: 500 }
    );
  }
}
