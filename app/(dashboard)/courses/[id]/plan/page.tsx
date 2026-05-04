import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import PlanClient from '@/components/dashboard/PlanClient';

export default async function CoursePlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      curriculumPlan: true,
      syllabus: true
    }
  });

  if (!course || !course.curriculumPlan) {
    notFound();
  }

  const curriculum = JSON.parse(course.curriculumPlan.data as string);

  return (
    <PlanClient 
      courseId={id} 
      courseTitle={course.title} 
      curriculum={curriculum} 
    />
  );
}
