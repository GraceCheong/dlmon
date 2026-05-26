import prisma from '@/lib/prisma';
import { requireUserOrRedirect } from '@/lib/auth-helpers';
import AssignmentsListClient from '@/components/dashboard/AssignmentsListClient';

export default async function AssignmentsPage() {
  const userId = await requireUserOrRedirect();

  const courses = await prisma.course.findMany({
    where: { userId },
    include: {
      lessons: {
        include: {
          assignments: {
            include: { submissions: { select: { id: true, status: true } } },
          },
        },
      },
    },
  });

  const assignments = courses.flatMap(c =>
    c.lessons.flatMap(l =>
      l.assignments.map(a => ({
        id: a.id,
        title: a.title,
        type: a.type,
        dueDate: a.dueDate,
        courseTitle: c.title,
        lessonTitle: l.title,
        submissionCount: a.submissions.length,
        gradedCount: a.submissions.filter(s => s.status === 'graded').length,
      }))
    )
  );

  return <AssignmentsListClient assignments={assignments} />;
}
