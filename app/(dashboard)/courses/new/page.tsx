'use client';

import CourseForm from '@/components/dashboard/CourseForm';
import { useLanguage } from '@/context/LanguageContext';
import { ChevronRight, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { COURSE_TEMPLATES } from '@/lib/templates/courseTemplates';

export default function NewCoursePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [mode, setMode] = useState<'choose' | 'template' | 'custom'>('choose');
  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null);

  const handleTemplateSelect = async (templateId: string) => {
    setLoadingTemplate(templateId);
    try {
      const res = await fetch('/api/courses/from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      });
      const data = await res.json();
      if (data.id) {
        router.push(`/courses/${data.id}/plan`);
      }
    } catch (e) {
      console.error('Template creation failed:', e);
    } finally {
      setLoadingTemplate(null);
    }
  };

  if (mode === 'custom') {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#A0AEC0', fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem' }}>
            <Link href="/dashboard" style={{ color: 'inherit' }}>{t.common.dashboard}</Link>
            <ChevronRight size={14} />
            <button onClick={() => setMode('choose')} style={{ color: 'inherit', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>새 강좌</button>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--primary-hover)' }}>직접 만들기</span>
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#4A5568', marginBottom: '0.75rem' }}>{t.common.newCourse}</h1>
        </div>
        <CourseForm />
        <div style={{ height: '5rem' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#A0AEC0', fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem' }}>
          <Link href="/dashboard" style={{ color: 'inherit' }}>{t.common.dashboard}</Link>
          <ChevronRight size={14} />
          <span style={{ color: 'var(--primary-hover)' }}>새 강좌 만들기</span>
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#4A5568', marginBottom: '0.5rem' }}>어떻게 시작할까요?</h1>
        <p style={{ color: '#A0AEC0', fontSize: '1.05rem' }}>템플릿으로 빠르게 시작하거나, 직접 처음부터 만들어 보세요.</p>
      </div>

      {/* Start Options */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '3rem' }}>
        <button
          onClick={() => setMode('template')}
          className="card"
          style={{ padding: '2rem', textAlign: 'left', cursor: 'pointer', border: '2px solid var(--primary)', background: 'var(--primary-light)' }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚡</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4A5568', marginBottom: '0.5rem' }}>템플릿으로 시작</h3>
          <p style={{ color: '#718096', fontSize: '0.9rem' }}>검증된 커리큘럼 틀로 빠르게 강좌를 생성하세요. 클릭 한 번으로 완성!</p>
        </button>
        <button
          onClick={() => setMode('custom')}
          className="card"
          style={{ padding: '2rem', textAlign: 'left', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✏️</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4A5568', marginBottom: '0.5rem' }}>AI와 함께 직접 만들기</h3>
          <p style={{ color: '#718096', fontSize: '0.9rem' }}>강좌 목표와 수준을 입력하면 AI가 맞춤형 15주 커리큘럼을 생성합니다.</p>
        </button>
      </div>

      {/* Template Grid */}
      {mode === 'template' && (
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4A5568', marginBottom: '1.5rem' }}>
            <Sparkles size={20} style={{ display: 'inline', marginRight: '0.5rem', color: 'var(--primary)' }} />
            강좌 템플릿 선택
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {COURSE_TEMPLATES.map(tpl => (
              <div key={tpl.id} className="card" style={{ padding: '1.75rem', position: 'relative' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{tpl.emoji}</div>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 800, padding: '0.25rem 0.75rem',
                  borderRadius: '2rem', background: 'var(--primary-light)', color: 'var(--primary-hover)',
                  marginBottom: '0.75rem', display: 'inline-block'
                }}>{tpl.level}</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4A5568', marginBottom: '0.5rem' }}>{tpl.titleKo}</h3>
                <p style={{ color: '#718096', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>{tpl.descKo}</p>
                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', color: '#A0AEC0', marginBottom: '1.25rem' }}>
                  <span>📅 {tpl.weeks}주</span>
                  <span>•</span>
                  <span>{tpl.type}</span>
                </div>
                <button
                  onClick={() => handleTemplateSelect(tpl.id)}
                  disabled={loadingTemplate !== null}
                  className="btn btn-primary"
                  style={{ width: '100%', fontSize: '0.9rem' }}
                >
                  {loadingTemplate === tpl.id ? (
                    <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> 생성 중...</>
                  ) : (
                    <>이 템플릿으로 시작 <ArrowRight size={16} /></>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ height: '5rem' }} />
      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
