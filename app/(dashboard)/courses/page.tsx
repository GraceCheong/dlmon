import prisma from '@/lib/prisma';
import MyCoursesClient from '@/components/dashboard/MyCoursesClient';
import { requireUserOrRedirect } from '@/lib/auth-helpers';

export default async function MyCoursesPage() {
  const userId = await requireUserOrRedirect();

  const [courses, templates] = await Promise.all([
    prisma.course.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { lessons: { select: { id: true, status: true } } },
    }),
    prisma.template.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, title: true, description: true, type: true,
        targetAudience: true, hskLevel: true, sourceType: true, updatedAt: true,
        marketplaceEntries: { where: { isActive: true }, select: { id: true }, take: 1 },
      },
    }),
  ]);

  const enhancedCourses = courses.map((course) => ({
    id: course.id,
    title: course.title,
    level: course.level,
    weeks: course.weeks,
    updatedAt: course.updatedAt.toISOString(),
    startDate: course.startDate?.toISOString(),
    endDate: course.endDate?.toISOString(),
    lessonCount: course.lessons.length,
    publishedCount: course.lessons.filter((l) => l.status === 'published').length,
  }));

  const serializedTemplates = templates.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    type: t.type,
    targetAudience: t.targetAudience,
    hskLevel: t.hskLevel,
    sourceType: t.sourceType,
    updatedAt: t.updatedAt.toISOString(),
    isPublished: t.marketplaceEntries.length > 0,
  }));

  return <MyCoursesClient courses={enhancedCourses} initialTemplates={serializedTemplates} />;
}
