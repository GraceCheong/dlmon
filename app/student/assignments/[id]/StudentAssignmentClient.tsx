'use client';

import { useState } from 'react';
import { AlertCircle, Download, Eye, Send, Loader2, Clock, FileText, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AssignmentAttachment {
  id: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  conversionStatus: string;
}

interface Props {
  assignment: {
    id: string;
    type: string;
    title: string;
    prompt: string;
    dueDate?: string;
    lesson: { title: string; course: { title: string } };
    attachments: AssignmentAttachment[];
  };
  member: { id: string; name: string };
  existingSubmission: { contentText: string; aiScore: number; aiFeedback: string } | null;
}

export default function StudentAssignmentClient({ assignment, member, existingSubmission }: Props) {
  const router = useRouter();
  const [content, setContent] = useState(existingSubmission?.contentText || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submission, setSubmission] = useState(existingSubmission);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const response = await fetch('/api/ai/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: assignment.id,
          memberId: member.id,
          content: content,
          prompt: assignment.prompt
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSubmission(data.submission);
        router.refresh();
      } else {
        const data = await response.json().catch(() => ({}));
        if (response.status === 409 && data.submission) {
          setSubmission(data.submission);
        }
        setSubmitError(data.error || '과제 제출에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } catch (error) {
      console.error(error);
      setSubmitError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              {assignment.type === 'writing' ? '작문 과제' : '말하기 과제'}
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2D3748', marginBottom: '0.5rem' }}>{assignment.title}</h1>
            <div style={{ color: '#718096', fontSize: '0.9rem' }}>
              {assignment.lesson.course.title} • {assignment.lesson.title}
            </div>
          </div>
          {assignment.dueDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#F8FAFC', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', color: '#4A5568', fontSize: '0.85rem', fontWeight: 600 }}>
              <Clock size={16} /> 마감: {new Date(assignment.dueDate).toLocaleDateString()}
            </div>
          )}
        </div>

        <div style={{ background: '#F8FAFC', padding: '1.5rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--primary)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#4A5568', marginBottom: '0.5rem' }}>선생님의 지시사항</h3>
          <p style={{ color: '#4A5568', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{assignment.prompt}</p>
        </div>

        {assignment.attachments.length > 0 && (
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#4A5568', marginBottom: '0.75rem' }}>첨부파일</h3>
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              {assignment.attachments.map((file) => {
                const routeBase = `/api/public/assignments/${assignment.id}/files/${file.id}`;
                const query = `memberId=${encodeURIComponent(member.id)}`;
                const previewAvailable = file.fileType === 'pdf' || file.conversionStatus === 'done';
                return (
                  <div
                    key={file.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.75rem',
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: '#2D3748', fontWeight: 800, fontSize: '0.9rem', overflowWrap: 'anywhere' }}>
                        {file.originalName}
                      </div>
                      <div style={{ color: '#718096', fontSize: '0.78rem' }}>
                        {file.fileType.toUpperCase()} · {Math.round(file.fileSize / 1024)} KB · {file.conversionStatus}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {previewAvailable && (
                        <a className="btn btn-secondary" href={`${routeBase}/preview?${query}`} target="_blank" rel="noreferrer" style={{ padding: '0.45rem 0.7rem', fontSize: '0.82rem', textDecoration: 'none' }}>
                          <Eye size={15} /> 미리보기
                        </a>
                      )}
                      <a className="btn btn-secondary" href={`${routeBase}/download?${query}`} style={{ padding: '0.45rem 0.7rem', fontSize: '0.82rem', textDecoration: 'none' }}>
                        <Download size={15} /> 다운로드
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {!submission ? (
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <FileText size={20} color="#4A5568" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2D3748' }}>답안 작성</h2>
          </div>
          
          <textarea
            className="input"
            placeholder="여기에 답변을 작성하세요..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ minHeight: '250px', resize: 'vertical', fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '1.5rem' }}
          />

          {submitError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', background: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--radius-md)', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600 }}>
              <AlertCircle size={17} /> {submitError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !content.trim()} 
              className="btn btn-primary"
              style={{ padding: '1rem 2rem', fontSize: '1rem', borderRadius: 'var(--radius-full)' }}
            >
              {isSubmitting ? <><Loader2 size={20} className="spin" style={{ marginRight: '0.5rem' }} /> AI 평가 중...</> : <><Send size={20} style={{ marginRight: '0.5rem' }} /> 제출 및 자동 평가받기</>}
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '2rem', border: '2px solid var(--primary-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>
            <Sparkles size={24} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>AI 평가 결과</h2>
          </div>

          <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <div style={{ background: '#F0FDF4', padding: '1.5rem', borderRadius: 'var(--radius-md)', flex: 1, minWidth: '200px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#166534', marginBottom: '0.5rem' }}>AI 점수</div>
              <div style={{ fontSize: '3rem', fontWeight: 900, color: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {submission.aiScore} <span style={{ fontSize: '1rem', color: '#15803D', fontWeight: 600 }}>/ 100</span>
              </div>
            </div>
            
            <div style={{ flex: 2, minWidth: '300px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4A5568', marginBottom: '0.75rem' }}>피드백</h3>
              <div style={{ background: '#F8FAFC', padding: '1.5rem', borderRadius: 'var(--radius-md)', color: '#2D3748', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                {submission.aiFeedback}
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4A5568', marginBottom: '0.75rem' }}>내가 제출한 답안</h3>
            <div style={{ padding: '1.5rem', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', color: '#718096', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
              {submission.contentText}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
