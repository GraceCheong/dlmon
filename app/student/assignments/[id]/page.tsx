import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import StudentAssignmentClient from './StudentAssignmentClient';

export default async function StudentAssignmentPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ memberId?: string }> }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const assignment = await prisma.assignment.findUnique({
    where: { id: resolvedParams.id },
    include: {
      lesson: {
        include: { course: true }
      }
    }
  });

  if (!assignment) {
    notFound();
  }

  let member = null;
  if (resolvedSearchParams.memberId) {
    member = await prisma.member.findUnique({
      where: { id: resolvedSearchParams.memberId }
    });
  }

  // If no member ID is provided in URL, we mock a student for demo purposes
  if (!member) {
    const defaultMember = await prisma.member.findFirst();
    member = defaultMember;
  }

  if (!member) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>학생 계정을 찾을 수 없습니다. 선생님이 학생 계정을 먼저 등록해야 합니다.</div>;
  }

  // Check if already submitted
  const existingSubmission = await prisma.submission.findFirst({
    where: {
      assignmentId: assignment.id,
      memberId: member.id
    }
  });

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <StudentAssignmentClient 
        assignment={assignment} 
        member={member} 
        existingSubmission={existingSubmission} 
      />
    </div>
  );
}
