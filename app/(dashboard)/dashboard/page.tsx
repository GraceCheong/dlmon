import prisma from '@/lib/prisma';
import DashboardClient from '@/components/dashboard/DashboardClient';
import { requireUserOrRedirect } from '@/lib/auth-helpers';

export default async function DashboardPage() {
  const userId = await requireUserOrRedirect();

  let enhancedCourses: {
    id: string; title: string; level: string; weeks: number;
    updatedAt: string; startDate?: string; endDate?: string;
    lessonCount: number; publishedCount: number;
  }[] = [];
  let stats = { totalCourses: 0, publishedLessons: 0, studentViews: 0 };
  let errorMsg: string | null = null;

  try {
    // Single query: courses with their lessons (eager-loaded — no N+1).
    const courses = await prisma.course.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { lessons: { select: { id: true, status: true } } },
    });

    enhancedCourses = courses.map((course) => ({
      id: course.id,
      title: course.title,
      level: course.level ?? '',
      weeks: course.weeks ?? 0,
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

    stats = {
      totalCourses: courses.length,
      publishedLessons: enhancedCourses.reduce((acc, c) => acc + c.publishedCount, 0),
      studentViews,
    };
  } catch (error) {
    console.error('Dashboard load error:', error);
    errorMsg = 'dashboard_error';
  }

  if (errorMsg !== null) {
    return (
      <div style={{ padding: '2rem', color: '#991B1B', background: '#FEF2F2', borderRadius: '1rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>대시보드를 불러오지 못했습니다</h2>
        <p style={{ color: '#718096' }}>잠시 후 다시 시도해 주세요.</p>
      </div>
    );
  }

  return <DashboardClient courses={enhancedCourses} stats={stats} />;
}
