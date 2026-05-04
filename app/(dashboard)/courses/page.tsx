import prisma from '@/lib/prisma';
import MyCoursesClient from '@/components/dashboard/MyCoursesClient';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function MyCoursesPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect('/login');
  }

  // Single query with eager-loaded lessons (was N+1 — one extra query per course).
  const courses = await prisma.course.findMany({
    where: { userId: (session.user as any).id },
    orderBy: { createdAt: 'desc' },
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

  return <MyCoursesClient courses={enhancedCourses} />;
}
