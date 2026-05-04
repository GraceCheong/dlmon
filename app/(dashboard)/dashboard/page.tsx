import prisma from '@/lib/prisma';
import DashboardClient from '@/components/dashboard/DashboardClient';
import { requireUserOrRedirect } from '@/lib/auth-helpers';

export default async function DashboardPage() {
  const userId = await requireUserOrRedirect();

  try {
    // Single query: courses with their lessons (eager-loaded — no N+1).
    const courses = await prisma.course.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { lessons: { select: { id: true, status: true } } },
    });

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

    // Real submission count for this teacher's members (was hardcoded 128).
    const studentViews = await prisma.submission.count({
      where: { member: { userId } },
    });

    const stats = {
      totalCourses: courses.length,
      publishedLessons: enhancedCourses.reduce((acc, c) => acc + c.publishedCount, 0),
      studentViews,
    };

    return <DashboardClient courses={enhancedCourses} stats={stats} />;
  } catch (error: any) {
    return (
      <div style={{ padding: '2rem', color: 'red' }}>
        <h1>Dashboard Error</h1>
        <pre>{error.message}</pre>
        <pre>{error.stack}</pre>
      </div>
    );
  }
}
