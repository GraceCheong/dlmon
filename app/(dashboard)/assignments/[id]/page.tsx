import prisma from '@/lib/prisma';
import { notFound } from "next/navigation";
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUserOrRedirect } from '@/lib/auth-helpers';
import AssignmentDetailClient from '@/components/dashboard/AssignmentDetailClient';

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export default async function AssignmentViewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const userId = await requireUserOrRedirect();

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
      submissions: {
        include: {
          member: true,
          evaluations: { orderBy: { evaluationVersion: 'desc' } },
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!assignment || assignment.lesson.course.userId !== userId) {
    notFound();
  }

  // Get all members associated with this teacher to see who hasn't submitted
  const allMembers = await prisma.member.findMany({
    where: { userId, deletedAt: null },
    orderBy: { name: 'asc' },
  });

  const submittedMemberIds = assignment.submissions.map(s => s.memberId);
  const pendingMembers = allMembers.filter(m => !submittedMemberIds.includes(m.id));
  const activeRubric = assignment.rubricId
    ? await prisma.writingRubric.findFirst({
      where: { id: assignment.rubricId, ownerId: userId },
    })
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <Link href="/assignments" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#718096', textDecoration: 'none', marginBottom: '1rem', fontWeight: 600 }}>
          <ArrowLeft size={16} /> 목록으로 돌아가기
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              {assignment.lesson.course.title} &gt; {assignment.lesson.title}
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4A5568' }}>{assignment.title}</h1>
            <div style={{ color: '#A0AEC0', fontSize: '0.95rem', marginTop: '0.25rem', display: 'flex', gap: '1rem' }}>
              <span>유형: {assignment.type === 'writing' ? '작문' : '말하기'}</span>
              {assignment.dueDate && <span>마감일: {new Date(assignment.dueDate).toLocaleDateString()}</span>}
            </div>
          </div>
          
          <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', gap: '1.5rem', border: '1px solid #E2E8F0' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#718096', fontWeight: 600 }}>제출 완료</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{assignment.submissions.length}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#718096', fontWeight: 600 }}>미제출</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#E53E3E' }}>{pendingMembers.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4A5568', marginBottom: '1rem' }}>과제 지시문 (프롬프트)</h3>
        <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-md)', color: '#4A5568', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
          {assignment.prompt}
        </div>
        
        {assignment.attachments.length > 0 && (
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#4A5568', marginBottom: '0.75rem' }}>첨부파일</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {assignment.attachments.map(({ uploadedFile }) => (
                <a
                  key={uploadedFile.id}
                  href={`/api/files/${uploadedFile.id}/download`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.55rem 0.75rem',
                    color: '#4A5568',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  {uploadedFile.originalName}
                  <span style={{ color: '#A0AEC0', fontSize: '0.75rem' }}>
                    {uploadedFile.fileType.toUpperCase()} · {uploadedFile.conversionStatus}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <AssignmentDetailClient
        assignment={{
          id: assignment.id,
          title: assignment.title,
          prompt: assignment.prompt,
          dueDate: assignment.dueDate ? assignment.dueDate.toISOString() : null,
          type: assignment.type,
          rubricId: assignment.rubricId,
          hskLevel: assignment.hskLevel,
          targetAudience: assignment.targetAudience,
          rubric: activeRubric ? {
            id: activeRubric.id,
            hskLevel: activeRubric.hskLevel,
            targetAudience: activeRubric.targetAudience,
            criteria: parseJson<Record<string, string>>(activeRubric.criteria, {}),
            deductionPolicy: parseJson<Record<string, number>>(activeRubric.deductionPolicy, {}),
            createdByAi: activeRubric.createdByAi,
            version: activeRubric.version,
            status: activeRubric.status,
          } : null,
        }}
        initialSubmissions={assignment.submissions.map((submission) => ({
          id: submission.id,
          memberId: submission.memberId,
          memberName: submission.member.name,
          contentText: submission.contentText,
          aiScore: submission.aiScore,
          aiFeedback: submission.aiFeedback,
          createdAt: submission.createdAt.toISOString(),
          evaluations: submission.evaluations.map((evaluation) => ({
            id: evaluation.id,
            score100: evaluation.score100,
            score10: evaluation.score10,
            overallSummary: evaluation.overallSummary,
            teacherComment: evaluation.teacherComment,
            deductions: parseJson(evaluation.deductions, []),
            sentenceFeedback: parseJson(evaluation.sentenceFeedback, []),
            rubricSnapshot: parseJson<Record<string, unknown> | null>(evaluation.rubricSnapshot, null),
            evaluationVersion: evaluation.evaluationVersion,
            createdAt: evaluation.createdAt.toISOString(),
          })),
        }))}
        members={allMembers.map((member) => ({
          id: member.id,
          name: member.name,
          className: member.className,
        }))}
        pendingMemberCount={pendingMembers.length}
      />
    </div>
  );
}
