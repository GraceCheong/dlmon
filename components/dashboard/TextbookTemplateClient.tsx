'use client';

import { useState } from 'react';
import {
  BookOpen,
  Loader2,
  Sparkles,
  Save,
  ChevronDown,
  ChevronUp,
  ArrowDown,
  ArrowUp,
  Plus,
  Trash2,
  Check,
} from 'lucide-react';
import AudienceSelector from '@/components/shared/AudienceSelector';
import { useRouter } from 'next/navigation';

const HSK_LEVELS = ['', 'HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'];

interface TemplateSection {
  title: string;
  activities: string[];
  resources: string[];
  notes: string;
}

interface DraftTemplate {
  title: string;
  overview: string;
  sections: TemplateSection[];
  resources: string[];
  notes: string;
}

function splitLines(value: string): string[] {
  return value.split('\n').map((l) => l.trim()).filter(Boolean);
}

export default function TextbookTemplateClient() {
  // Form inputs
  const [textbookTitle, setTextbookTitle] = useState('');
  const [unitTitle, setUnitTitle] = useState('');
  const [unitTopics, setUnitTopics] = useState('');
  const [grammarPoints, setGrammarPoints] = useState('');
  const [vocabulary, setVocabulary] = useState('');
  const [hskLevel, setHskLevel] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [lessonCount, setLessonCount] = useState(3);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [draft, setDraft] = useState<DraftTemplate | null>(null);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  const router = useRouter();

  const handleGenerate = async () => {
    if (!textbookTitle.trim() || !unitTitle.trim() || !targetAudience) return;
    setGenerating(true);
    setGenError('');
    setDraft(null);
    setSaved(false);
    try {
      const res = await fetch('/api/ai/textbook-template/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textbookTitle,
          unitTitle,
          unitTopics: unitTopics || undefined,
          grammarPoints: grammarPoints || undefined,
          vocabulary: vocabulary || undefined,
          hskLevel: hskLevel || undefined,
          targetAudience,
          lessonCount,
          saveAsTemplate: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error || 'AI 생성에 실패했습니다.');
        return;
      }
      // Normalise sections
      const sections: TemplateSection[] = (Array.isArray(data.draft?.sections) ? data.draft.sections : []).map(
        (s: Partial<TemplateSection>) => ({
          title: typeof s.title === 'string' ? s.title : '수업 단계',
          activities: Array.isArray(s.activities) ? s.activities.map(String) : [],
          resources: Array.isArray(s.resources) ? s.resources.map(String) : [],
          notes: typeof s.notes === 'string' ? s.notes : '',
        }),
      );
      setDraft({
        title: data.draft?.title || `${textbookTitle} - ${unitTitle}`,
        overview: data.draft?.overview || '',
        sections,
        resources: Array.isArray(data.draft?.resources) ? data.draft.resources.map(String) : [],
        notes: typeof data.draft?.notes === 'string' ? data.draft.notes : '',
      });
    } catch {
      setGenError('서버와 통신하는 중 오류가 발생했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          description: draft.overview || null,
          hskLevel: hskLevel || null,
          targetAudience: targetAudience || null,
          type: 'lesson',
          sourceType: 'ai',
          content: {
            format: 'template_content_v1',
            overview: draft.overview,
            sections: draft.sections,
            resources: draft.resources,
            notes: draft.notes,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error || '저장 실패'); return; }
      setSaved(true);
      setTimeout(() => router.push('/templates'), 1200);
    } catch {
      setSaveError('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // Draft editing helpers
  const updateSection = (index: number, patch: Partial<TemplateSection>) => {
    if (!draft) return;
    setDraft({ ...draft, sections: draft.sections.map((s, i) => i === index ? { ...s, ...patch } : s) });
  };
  const addSection = () => {
    if (!draft) return;
    setDraft({ ...draft, sections: [...draft.sections, { title: '새 섹션', activities: [], resources: [], notes: '' }] });
  };
  const removeSection = (index: number) => {
    if (!draft || draft.sections.length <= 1) return;
    setDraft({ ...draft, sections: draft.sections.filter((_, i) => i !== index) });
  };
  const moveSection = (index: number, dir: -1 | 1) => {
    if (!draft) return;
    const next = index + dir;
    if (next < 0 || next >= draft.sections.length) return;
    const sections = [...draft.sections];
    [sections[index], sections[next]] = [sections[next], sections[index]];
    setDraft({ ...draft, sections });
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4A5568', marginBottom: '0.25rem' }}>교재 기반 템플릿 생성</h1>
        <p style={{ color: '#A0AEC0', fontSize: '0.95rem' }}>교재와 단원 정보를 입력하면 AI가 수업 템플릿 초안을 생성합니다.</p>
      </div>

      {/* Input form */}
      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#2D3748', marginBottom: '1.25rem' }}>교재 및 단원 정보</h2>
        <div style={{ display: 'grid', gap: '0.85rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#718096', display: 'block', marginBottom: '0.3rem' }}>교재명 *</label>
              <input className="input" value={textbookTitle} onChange={(e) => setTextbookTitle(e.target.value)} placeholder="예: 신 HSK 표준 교과서 3급" />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#718096', display: 'block', marginBottom: '0.3rem' }}>단원/챕터명 *</label>
              <input className="input" value={unitTitle} onChange={(e) => setUnitTitle(e.target.value)} placeholder="예: 제3과 - 쇼핑" />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#718096', display: 'block', marginBottom: '0.3rem' }}>단원 주제 및 의사소통 기능</label>
            <input className="input" value={unitTopics} onChange={(e) => setUnitTopics(e.target.value)} placeholder="예: 물건 사기, 가격 묻기, 비교 표현" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#718096', display: 'block', marginBottom: '0.3rem' }}>주요 문법 포인트</label>
              <input className="input" value={grammarPoints} onChange={(e) => setGrammarPoints(e.target.value)} placeholder="예: 比 비교문, 太…了, 一点儿" />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#718096', display: 'block', marginBottom: '0.3rem' }}>핵심 어휘</label>
              <input className="input" value={vocabulary} onChange={(e) => setVocabulary(e.target.value)} placeholder="예: 贵、便宜、颜色、多少钱" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 140px 140px 100px', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#718096', display: 'block', marginBottom: '0.3rem' }}>대상 수준 *</label>
              <AudienceSelector value={targetAudience} onChange={setTargetAudience} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#718096', display: 'block', marginBottom: '0.3rem' }}>HSK 수준</label>
              <select className="input" value={hskLevel} onChange={(e) => setHskLevel(e.target.value)}>
                {HSK_LEVELS.map((l) => <option key={l} value={l}>{l || 'HSK 선택'}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#718096', display: 'block', marginBottom: '0.3rem' }}>섹션 수</label>
              <select className="input" value={lessonCount} onChange={(e) => setLessonCount(Number(e.target.value))}>
                {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}개</option>)}
              </select>
            </div>
          </div>
        </div>

        {genError && (
          <div style={{ background: '#FEF2F2', color: '#991B1B', borderRadius: 'var(--radius-md)', padding: '0.65rem 1rem', fontSize: '0.875rem', marginTop: '1rem' }}>
            {genError}
          </div>
        )}

        <button
          className="btn btn-primary"
          style={{ marginTop: '1.25rem' }}
          onClick={handleGenerate}
          disabled={generating || !textbookTitle.trim() || !unitTitle.trim() || !targetAudience}
        >
          {generating
            ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> AI 생성 중...</>
            : <><Sparkles size={16} /> AI 템플릿 생성</>}
        </button>
      </div>

      {/* Generated draft editor */}
      {draft && (
        <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#2D3748' }}>생성된 템플릿 초안</h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {saved && (
                <span style={{ fontSize: '0.875rem', color: '#16A34A', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Check size={15} /> 저장됨
                </span>
              )}
              {saveError && <span style={{ fontSize: '0.8rem', color: '#991B1B' }}>{saveError}</span>}
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || saved} style={{ fontSize: '0.875rem' }}>
                {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
                템플릿 저장
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '0.85rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#718096', display: 'block', marginBottom: '0.3rem' }}>제목</label>
              <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#718096', display: 'block', marginBottom: '0.3rem' }}>개요</label>
              <textarea className="input" value={draft.overview} onChange={(e) => setDraft({ ...draft, overview: e.target.value })} style={{ minHeight: '80px', resize: 'vertical' }} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4A5568' }}>섹션 및 활동</label>
                <button className="btn btn-secondary" onClick={addSection} style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}>
                  <Plus size={13} /> 섹션 추가
                </button>
              </div>
              <div style={{ display: 'grid', gap: '0.65rem' }}>
                {draft.sections.map((section, index) => (
                  <div key={index} style={{ border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <input className="input" value={section.title} onChange={(e) => updateSection(index, { title: e.target.value })} placeholder="섹션 제목" style={{ fontSize: '0.875rem' }} />
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-secondary" onClick={() => moveSection(index, -1)} disabled={index === 0} style={{ padding: '0.35rem' }}><ArrowUp size={13} /></button>
                        <button className="btn btn-secondary" onClick={() => moveSection(index, 1)} disabled={index === draft.sections.length - 1} style={{ padding: '0.35rem' }}><ArrowDown size={13} /></button>
                        <button className="btn btn-secondary" onClick={() => removeSection(index)} disabled={draft.sections.length <= 1} style={{ padding: '0.35rem', color: '#B91C1C' }}><Trash2 size={13} /></button>
                      </div>
                    </div>
                    <textarea className="input" value={section.activities.join('\n')} onChange={(e) => updateSection(index, { activities: splitLines(e.target.value) })} placeholder="활동 목록 (줄바꿈으로 구분)" style={{ minHeight: '80px', resize: 'vertical', fontSize: '0.82rem', marginBottom: '0.4rem' }} />
                    <textarea className="input" value={section.resources.join('\n')} onChange={(e) => updateSection(index, { resources: splitLines(e.target.value) })} placeholder="섹션 자료 (줄바꿈으로 구분)" style={{ minHeight: '55px', resize: 'vertical', fontSize: '0.82rem', marginBottom: '0.4rem' }} />
                    <textarea className="input" value={section.notes} onChange={(e) => updateSection(index, { notes: e.target.value })} placeholder="교사 메모" style={{ minHeight: '50px', resize: 'vertical', fontSize: '0.82rem' }} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#718096', display: 'block', marginBottom: '0.3rem' }}>공통 자료</label>
              <textarea className="input" value={draft.resources.join('\n')} onChange={(e) => setDraft({ ...draft, resources: splitLines(e.target.value) })} placeholder="공통 수업 자료 (줄바꿈으로 구분)" style={{ minHeight: '65px', resize: 'vertical' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#718096', display: 'block', marginBottom: '0.3rem' }}>전체 메모</label>
              <textarea className="input" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="전체 운영 메모" style={{ minHeight: '65px', resize: 'vertical' }} />
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
