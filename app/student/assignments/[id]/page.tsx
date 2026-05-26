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
      },
      attachments: {
        include: {
          uploadedFile: {
            select: {
              id: true,
              originalName: true,
              fileType: true,
              fileSize: true,
              conversionStatus: true,
            },
          },
        },
      },
    }
  });

  if (!assignment) {
    notFound();
  }

  let member = null;
  if (resolvedSearchParams.memberId) {
    member = await prisma.member.findUnique({
      where: { id: resolvedSearchParams.memberId },
    });
    // Verify the member belongs to the same teacher as this assignment.
    if (member && member.userId !== assignment.lesson.course.userId) {
      member = null;
    }
  }

  if (!member) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        유효한 학생 링크가 필요합니다. 선생님이 제공한 링크를 사용하세요.
      </div>
    );
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
        assignment={{
          id: assignment.id,
          type: assignment.type,
          title: assignment.title,
          prompt: assignment.prompt,
          dueDate: assignment.dueDate?.toISOString(),
          lesson: { title: assignment.lesson.title, course: { title: assignment.lesson.course.title } },
          attachments: assignment.attachments.map(({ uploadedFile }) => uploadedFile),
        }}
        member={{ id: member.id, name: member.name }}
        existingSubmission={existingSubmission ? {
          contentText: existingSubmission.contentText ?? '',
          aiScore: existingSubmission.aiScore ?? 0,
          aiFeedback: existingSubmission.aiFeedback ?? '',
        } : null}
      />
    </div>
  );
}
