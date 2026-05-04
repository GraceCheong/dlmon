import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete associated data first (cascading delete would be better in schema, but let's do it manually for safety)
    await prisma.curriculumPlan.deleteMany({ where: { courseId: id } });
    await prisma.syllabus.deleteMany({ where: { courseId: id } });
    
    // Delete lesson blocks and lessons
    const lessons = await prisma.lesson.findMany({ where: { courseId: id } });
    const lessonIds = lessons.map(l => l.id);
    await prisma.lessonBlock.deleteMany({ where: { lessonId: { in: lessonIds } } });
    await prisma.lesson.deleteMany({ where: { courseId: id } });

    // Finally delete the course
    await prisma.course.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Course deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete course' },
      { status: 500 }
    );
  }
}
