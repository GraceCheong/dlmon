import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const { id } = await params;

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course || course.userId !== userId) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.curriculumPlan.deleteMany({ where: { courseId: id } });
      await tx.syllabus.deleteMany({ where: { courseId: id } });

      const lessons = await tx.lesson.findMany({ where: { courseId: id } });
      const lessonIds = lessons.map((l) => l.id);

      const assignments = await tx.assignment.findMany({ where: { lessonId: { in: lessonIds } } });
      const assignmentIds = assignments.map((a) => a.id);

      // Delete evaluation chain before submissions
      const submissions = await tx.submission.findMany({ where: { assignmentId: { in: assignmentIds } } });
      const submissionIds = submissions.map((s) => s.id);
      await tx.writingEvaluation.deleteMany({ where: { submissionId: { in: submissionIds } } });

      await tx.submission.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
      await tx.writingRubric.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
      await tx.assignment.deleteMany({ where: { lessonId: { in: lessonIds } } });

      await tx.lessonBlock.deleteMany({ where: { lessonId: { in: lessonIds } } });
      await tx.lesson.deleteMany({ where: { courseId: id } });
      await tx.course.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Course deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
}
