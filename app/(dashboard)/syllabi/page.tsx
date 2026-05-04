import prisma from '@/lib/prisma';
import SyllabiClient from '@/components/dashboard/SyllabiClient';

export default async function SyllabiPage() {
  const syllabi = await prisma.syllabus.findMany({
    include: {
      course: true
    },
    orderBy: {
      course: {
        updatedAt: 'desc'
      }
    }
  });

  const formattedSyllabi = syllabi.map(s => ({
    id: s.id,
    courseId: s.courseId,
    courseTitle: s.course.title,
    level: s.course.level,
    updatedAt: s.course.updatedAt.toISOString(),
  }));

  return <SyllabiClient syllabi={formattedSyllabi} />;
}
