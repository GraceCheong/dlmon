import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import SyllabusActions from '@/components/dashboard/SyllabusActions';

export default async function SyllabusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: { syllabus: true },
  });

  if (!course || !course.syllabus) {
    notFound();
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#A0AEC0', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            <Link href="/dashboard" style={{ color: 'inherit' }}>대시보드</Link>
            <ChevronRight size={14} />
            <Link href={`/courses/${id}/plan`} style={{ color: 'inherit' }}>{course.title}</Link>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--primary-hover)' }}>강의 계획서</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#4A5568' }}>강의 계획서 미리보기</h1>
          <p style={{ color: '#A0AEC0', marginTop: '0.25rem' }}>선생님의 입력을 바탕으로 AI가 생성한 공식 문서입니다.</p>
        </div>
      </div>

      <SyllabusActions courseId={id} initialContent={course.syllabus.content} />

      <div style={{ height: '5rem' }} />
    </div>
  );
}
