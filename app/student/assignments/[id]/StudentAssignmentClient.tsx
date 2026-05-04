'use client';

import { useState } from 'react';
import { Send, Loader2, Award, Clock, FileText, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StudentAssignmentClient({ assignment, member, existingSubmission }: { assignment: any, member: any, existingSubmission: any }) {
  const router = useRouter();
  const [content, setContent] = useState(existingSubmission?.contentText || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submission, setSubmission] = useState(existingSubmission);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
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
        console.error('Failed to submit assignment');
      }
    } catch (error) {
      console.error(error);
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
