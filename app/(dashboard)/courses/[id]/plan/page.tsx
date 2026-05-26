import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import PlanClient from '@/components/dashboard/PlanClient';
import { requireUserOrRedirect } from '@/lib/auth-helpers';

export default async function CoursePlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserOrRedirect();

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      curriculumPlan: true,
      syllabus: true,
      lessons: {
        orderBy: { order: 'asc' },
        include: {
          blocks: { select: { id: true } },
          assignments: {
            orderBy: { dueDate: 'asc' },
            include: {
              attachments: {
                include: {
                  uploadedFile: {
                    select: {
                      id: true,
                      originalName: true,
                      fileType: true,
                      fileSize: true,
                      conversionStatus: true,
                      description: true,
                      createdAt: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  const files = await prisma.uploadedFile.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      originalName: true,
      fileType: true,
      fileSize: true,
      conversionStatus: true,
      description: true,
      createdAt: true,
    },
  });

  if (!course || course.userId !== userId || !course.curriculumPlan) {
    notFound();
  }

  const curriculum = JSON.parse(course.curriculumPlan.data as string);
  const lessons = course.lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    order: lesson.order,
    status: lesson.status,
    slug: lesson.slug,
    blockCount: lesson.blocks.length,
    updatedAt: lesson.updatedAt.toISOString(),
    assignments: lesson.assignments.map((assignment) => ({
      id: assignment.id,
      lessonId: assignment.lessonId,
      title: assignment.title,
      type: assignment.type,
      prompt: assignment.prompt,
      dueDate: assignment.dueDate?.toISOString() ?? null,
      hskLevel: assignment.hskLevel,
      targetAudience: assignment.targetAudience,
      attachments: assignment.attachments.map(({ uploadedFile }) => ({
        id: uploadedFile.id,
        originalName: uploadedFile.originalName,
        fileType: uploadedFile.fileType,
        fileSize: uploadedFile.fileSize,
        conversionStatus: uploadedFile.conversionStatus,
        description: uploadedFile.description,
        createdAt: uploadedFile.createdAt.toISOString(),
      })),
    })),
  }));

  return (
    <PlanClient 
      courseId={id} 
      courseTitle={course.title} 
      curriculum={curriculum} 
      lessons={lessons}
      files={files.map((file) => ({
        ...file,
        createdAt: file.createdAt.toISOString(),
      }))}
    />
  );
}
