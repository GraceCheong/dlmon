import prisma from '@/lib/prisma';
import { notFound } from "next/navigation";
import Link from 'next/link';
import { ArrowLeft, Users, CheckCircle } from 'lucide-react';
import { requireUserOrRedirect } from '@/lib/auth-helpers';

export default async function AssignmentViewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const userId = await requireUserOrRedirect();

  const assignment = await prisma.assignment.findUnique({
    where: { id: resolvedParams.id },
    include: {
      lesson: {
        include: { course: true }
      },
      submissions: {
        include: { member: true },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!assignment) {
    notFound();
  }

  // Get all members associated with this teacher to see who hasn't submitted
  const allMembers = await prisma.member.findMany({
    where: { userId }
  });

  const submittedMemberIds = assignment.submissions.map(s => s.memberId);
  const pendingMembers = allMembers.filter(m => !submittedMemberIds.includes(m.id));

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
        
        <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#718096' }}>
          <strong>학생용 공유 링크: </strong>
          <code style={{ background: '#E2E8F0', padding: '0.2rem 0.5rem', borderRadius: '4px', userSelect: 'all' }}>
            {process.env.NEXTAUTH_URL || 'http://localhost:3000'}/student/assignments/{assignment.id}
          </code>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2D3748', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={20} /> 학생 제출 현황
        </h2>
        
        {assignment.submissions.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#A0AEC0' }}>
            <p>아직 제출된 과제가 없습니다.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {assignment.submissions.map(submission => (
              <div key={submission.id} className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                      {submission.member.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#2D3748' }}>{submission.member.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#718096' }}>{new Date(submission.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#F0FDF4', color: '#166534', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
                    <CheckCircle size={16} /> AI 점수: {submission.aiScore} / 100
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#718096', marginBottom: '0.5rem' }}>제출 내용</h4>
                    <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-md)', color: '#4A5568', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                      {submission.contentText}
                    </div>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#718096', marginBottom: '0.5rem' }}>AI 피드백</h4>
                    <div style={{ background: '#FEF2F2', padding: '1rem', borderRadius: 'var(--radius-md)', color: '#991B1B', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                      {submission.aiFeedback}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
