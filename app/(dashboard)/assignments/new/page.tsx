import prisma from '@/lib/prisma';
import AssignmentFormClient from './AssignmentFormClient';
import { requireUserOrRedirect } from '@/lib/auth-helpers';

export default async function NewAssignmentPage() {
  const userId = await requireUserOrRedirect();

  // Fetch courses and their lessons for the dropdowns
  const courses = await prisma.course.findMany({
    where: { userId },
    include: {
      lessons: true
    }
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

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4A5568', marginBottom: '0.5rem' }}>새 과제 만들기</h1>
      <p style={{ color: '#A0AEC0', marginBottom: '2rem' }}>수업에 연계된 새로운 과제를 생성합니다.</p>
      
      <AssignmentFormClient
        courses={courses.map((course) => ({
          id: course.id,
          title: course.title,
          lessons: course.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title })),
        }))}
        files={files.map((file) => ({
          ...file,
          createdAt: file.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
