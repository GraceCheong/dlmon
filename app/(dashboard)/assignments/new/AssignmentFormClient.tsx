'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, FileText, CheckCircle } from 'lucide-react';

export default function AssignmentFormClient({ courses }: { courses: any[] }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(courses[0]?.id || '');
  const [formData, setFormData] = useState({
    title: '',
    lessonId: '',
    type: 'writing',
    prompt: '',
    dueDate: '',
  });

  const activeCourse = courses.find(c => c.id === selectedCourse);
  const lessons = activeCourse?.lessons || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lessonId || !formData.title || !formData.prompt) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push('/assignments');
        router.refresh();
      } else {
        console.error('Failed to create assignment');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#4A5568' }}>연계 강좌</label>
          <select 
            className="input" 
            value={selectedCourse} 
            onChange={(e) => {
              setSelectedCourse(e.target.value);
              setFormData({ ...formData, lessonId: '' });
            }}
            required
          >
            <option value="" disabled>강좌 선택</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#4A5568' }}>연계 수업 (Lesson)</label>
          <select 
            className="input" 
            value={formData.lessonId} 
            onChange={(e) => setFormData({ ...formData, lessonId: e.target.value })}
            required
            disabled={!selectedCourse}
          >
            <option value="" disabled>수업 선택</option>
            {lessons.map((l: any) => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#4A5568' }}>과제명</label>
        <input 
          type="text" 
          className="input" 
          value={formData.title} 
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="예: 3주차 작문 과제 - 자기소개서 작성"
          required
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#4A5568' }}>과제 유형</label>
          <select 
            className="input" 
            value={formData.type} 
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            required
          >
            <option value="writing">작문 (Writing)</option>
            <option value="speaking">말하기 (Speaking)</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#4A5568' }}>제출 마감일 (선택)</label>
          <input 
            type="date" 
            className="input" 
            value={formData.dueDate} 
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          />
        </div>
      </div>

      <div style={{ marginBottom: '2.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#4A5568' }}>과제 프롬프트 (학생에게 보일 지시문)</label>
        <textarea 
          className="input" 
          value={formData.prompt} 
          onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
          placeholder="예: 배운 어휘를 사용하여 100자 내외의 자기소개서를 작성하세요. 이름, 국적, 직업이 포함되어야 합니다."
          style={{ minHeight: '150px', resize: 'vertical' }}
          required
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        <button type="button" onClick={() => router.back()} className="btn btn-secondary">
          취소
        </button>
        <button type="submit" disabled={isSubmitting || !formData.lessonId || !formData.title || !formData.prompt} className="btn btn-primary">
          {isSubmitting ? <><Loader2 size={18} className="spin" style={{ marginRight: '0.5rem' }} /> 저장 중...</> : <><Save size={18} style={{ marginRight: '0.5rem' }} /> 과제 생성</>}
        </button>
      </div>
    </form>
  );
}
