'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Loader2, Plus, Trash2 } from 'lucide-react';
import { audienceLabel } from '@/components/shared/AudienceSelector';

interface MarketTemplate {
  id: string;
  title: string;
  description: string | null;
  type: string;
  targetAudience: string | null;
  hskLevel: string | null;
  updatedAt: string;
}

export default function MarketTemplatesClient({ initialTemplates }: { initialTemplates: MarketTemplate[] }) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [loading, setLoading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');

  const createCourse = async (templateId: string) => {
    setLoading(templateId);
    setError('');
    try {
      const res = await fetch('/api/courses/from-user-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        router.push(`/courses/${data.id}/plan`);
      } else {
        setError(data.error || '강좌 생성에 실패했습니다.');
      }
    } catch {
      setError('강좌 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(null);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!window.confirm('이 템플릿을 삭제하시겠습니까?')) return;
    setDeleting(templateId);
    setError('');
    try {
      const res = await fetch(`/api/templates/${templateId}`, { method: 'DELETE' });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      } else {
        const data = await res.json();
        setError(data.error || '삭제에 실패했습니다.');
      }
    } catch {
      setError('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(null);
    }
  };

  if (templates.length === 0) {
    return (
      <div className="card" style={{ padding: '4rem', textAlign: 'center', color: '#A0AEC0' }}>
        <BookOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
        <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>저장된 마켓플레이스 템플릿이 없습니다</p>
        <p style={{ fontSize: '0.85rem' }}>
          <a href="/marketplace" style={{ color: 'var(--primary-hover)', textDecoration: 'underline' }}>마켓플레이스</a>에서
          마음에 드는 템플릿을 복사해 오세요.
        </p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: '0.75rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {templates.map((tpl) => (
          <div key={tpl.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                <BookOpen size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 700, color: '#2D3748', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tpl.title}
                </span>
              </div>
              <button
                onClick={() => deleteTemplate(tpl.id)}
                disabled={deleting === tpl.id || loading !== null}
                style={{ background: 'transparent', border: 'none', color: '#CBD5E0', cursor: 'pointer', padding: '0.2rem', flexShrink: 0, lineHeight: 0 }}
                title="삭제"
              >
                {deleting === tpl.id ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
              </button>
            </div>

            {tpl.description && (
              <p style={{ fontSize: '0.85rem', color: '#718096', lineHeight: 1.5, margin: 0 }}>{tpl.description}</p>
            )}

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {tpl.targetAudience && (
                <span style={{ fontSize: '0.75rem', background: '#EFF6FF', color: '#1D4ED8', padding: '0.15rem 0.5rem', borderRadius: '2rem' }}>
                  {audienceLabel(tpl.targetAudience)}
                </span>
              )}
              {tpl.hskLevel && (
                <span style={{ fontSize: '0.75rem', background: '#F0FDF4', color: '#166534', padding: '0.15rem 0.5rem', borderRadius: '2rem' }}>
                  {tpl.hskLevel}
                </span>
              )}
              {tpl.type && (
                <span style={{ fontSize: '0.75rem', background: '#F8FAFC', color: '#718096', padding: '0.15rem 0.5rem', borderRadius: '2rem' }}>
                  {tpl.type}
                </span>
              )}
            </div>

            <button
              className="btn btn-primary"
              onClick={() => createCourse(tpl.id)}
              disabled={loading !== null || deleting !== null}
              style={{ marginTop: 'auto', fontSize: '0.88rem', width: '100%' }}
            >
              {loading === tpl.id
                ? <><Loader2 size={15} className="spin" /> 생성 중...</>
                : <><Plus size={15} /> 이 템플릿으로 강좌 시작</>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
