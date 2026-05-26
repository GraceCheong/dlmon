'use client';

import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import AudienceSelector from '@/components/shared/AudienceSelector';

interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  targetAudience?: string;
  hskLevel?: string;
}

interface SavedPlan {
  id: string;
  title: string;
  targetAudience?: string;
  hskLevel?: string;
  updatedAt: string;
}

interface LessonSection {
  title: string;
  duration: string;
  activities: string[];
  teacherNotes?: string;
}

interface LessonPlanDraft {
  title: string;
  objectives: string[];
  duration: string;
  prerequisites?: string;
  sections: LessonSection[];
  materials: string[];
  assessment: string;
  homework?: string;
}

interface EditingPlan {
  id: string;
  title: string;
  targetAudience: string;
  hskLevel: string;
  content: LessonPlanDraft;
}

const HSK_LEVELS = ['', 'HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'];

function splitLines(value: string): string[] {
  return value.split('\n').map((line) => line.trim()).filter(Boolean);
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function emptyDraft(title = '수업 계획서'): LessonPlanDraft {
  return {
    title,
    objectives: [],
    duration: '',
    prerequisites: '',
    sections: [{ title: '도입', duration: '', activities: [], teacherNotes: '' }],
    materials: [],
    assessment: '',
    homework: '',
  };
}

function normalizeDraftContent(value: unknown, fallbackTitle: string): LessonPlanDraft | null {
  let raw = value;
  if (typeof value === 'string') {
    try {
      raw = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (!raw || typeof raw !== 'object') return emptyDraft(fallbackTitle);
  const source = raw as Partial<LessonPlanDraft>;
  const sections = Array.isArray(source.sections)
    ? source.sections.map((section) => ({
      title: typeof section?.title === 'string' ? section.title : '수업 단계',
      duration: typeof section?.duration === 'string' ? section.duration : '',
      activities: toStringArray(section?.activities),
      teacherNotes: typeof section?.teacherNotes === 'string' ? section.teacherNotes : '',
    }))
    : [];

  return {
    title: typeof source.title === 'string' ? source.title : fallbackTitle,
    objectives: toStringArray(source.objectives),
    duration: typeof source.duration === 'string' ? source.duration : '',
    prerequisites: typeof source.prerequisites === 'string' ? source.prerequisites : '',
    sections: sections.length > 0 ? sections : emptyDraft(fallbackTitle).sections,
    materials: toStringArray(source.materials),
    assessment: typeof source.assessment === 'string' ? source.assessment : '',
    homework: typeof source.homework === 'string' ? source.homework : '',
  };
}

export default function LessonPlanGeneratorClient({
  savedPrompts,
  initialPlans,
}: {
  savedPrompts: SavedPrompt[];
  initialPlans: SavedPlan[];
}) {
  const [prompts, setPrompts] = useState(savedPrompts);
  const [plans, setPlans] = useState(initialPlans);
  const [promptContent, setPromptContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [hskLevel, setHskLevel] = useState('');
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<LessonPlanDraft | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null);
  const [showPromptSave, setShowPromptSave] = useState(false);
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [promptSearch, setPromptSearch] = useState('');
  const [planSearch, setPlanSearch] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));
  const [editingPrompt, setEditingPrompt] = useState<SavedPrompt | null>(null);
  const [editingPlan, setEditingPlan] = useState<EditingPlan | null>(null);

  const filteredPrompts = useMemo(() => {
    const q = promptSearch.trim().toLowerCase();
    if (!q) return prompts;
    return prompts.filter((prompt) =>
      `${prompt.title} ${prompt.content} ${prompt.hskLevel || ''}`.toLowerCase().includes(q),
    );
  }, [promptSearch, prompts]);

  const filteredPlans = useMemo(() => {
    const q = planSearch.trim().toLowerCase();
    if (!q) return plans;
    return plans.filter((plan) =>
      `${plan.title} ${plan.targetAudience || ''} ${plan.hskLevel || ''}`.toLowerCase().includes(q),
    );
  }, [planSearch, plans]);

  const selectPrompt = (id: string) => {
    setSelectedPromptId(id);
    const prompt = prompts.find((item) => item.id === id);
    if (prompt) {
      setPromptContent(prompt.content);
      setTargetAudience(prompt.targetAudience || '');
      setHskLevel(prompt.hskLevel || '');
    }
  };

  const generate = async () => {
    if (!promptContent.trim()) return;
    if (!targetAudience) {
      setError('대상 수준을 선택해 주세요.');
      return;
    }
    setLoading(true);
    setError('');
    setSavedPlanId(null);
    try {
      const res = await fetch('/api/ai/lesson-plans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptContent, targetAudience, hskLevel }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'AI 생성에 실패했습니다.');
        return;
      }
      setDraft(data.draft as LessonPlanDraft);
      setEditTitle(data.draft?.title || '수업 계획서');
      setExpandedSections(new Set([0]));
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const savePlan = async () => {
    if (!draft) return;
    setSaving(true);
    setError('');
    try {
      const title = editTitle || draft.title;
      const res = await fetch('/api/lesson-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: { ...draft, title },
          targetAudience,
          hskLevel: hskLevel || null,
          promptId: selectedPromptId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '저장에 실패했습니다.');
        return;
      }
      const nextPlan = {
        id: data.plan.id,
        title: data.plan.title,
        targetAudience: data.plan.targetAudience ?? undefined,
        hskLevel: data.plan.hskLevel ?? undefined,
        updatedAt: new Date(data.plan.updatedAt).toISOString(),
      };
      setSavedPlanId(nextPlan.id);
      setPlans((prev) => [nextPlan, ...prev.filter((plan) => plan.id !== nextPlan.id)]);
    } catch {
      setError('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const savePrompt = async () => {
    if (!newPromptTitle.trim() || !promptContent.trim()) return;
    setSavingPrompt(true);
    setError('');
    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newPromptTitle, content: promptContent, targetAudience, hskLevel }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '프롬프트 저장에 실패했습니다.');
        return;
      }
      const nextPrompt = {
        id: data.prompt.id,
        title: data.prompt.title,
        content: data.prompt.content,
        targetAudience: data.prompt.targetAudience ?? undefined,
        hskLevel: data.prompt.hskLevel ?? undefined,
      };
      setPrompts((prev) => [nextPrompt, ...prev]);
      setSelectedPromptId(nextPrompt.id);
      setShowPromptSave(false);
      setNewPromptTitle('');
    } catch {
      setError('프롬프트 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingPrompt(false);
    }
  };

  const duplicatePrompt = async (prompt: SavedPrompt) => {
    setBusy(`prompt-copy:${prompt.id}`);
    setError('');
    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${prompt.title} 복사본`,
          content: prompt.content,
          targetAudience: prompt.targetAudience || null,
          hskLevel: prompt.hskLevel || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '프롬프트 복제에 실패했습니다.');
        return;
      }
      const nextPrompt = {
        id: data.prompt.id,
        title: data.prompt.title,
        content: data.prompt.content,
        targetAudience: data.prompt.targetAudience ?? undefined,
        hskLevel: data.prompt.hskLevel ?? undefined,
      };
      setPrompts((prev) => [nextPrompt, ...prev]);
      setSelectedPromptId(nextPrompt.id);
    } catch {
      setError('프롬프트 복제 중 오류가 발생했습니다.');
    } finally {
      setBusy(null);
    }
  };

  const updatePrompt = async () => {
    if (!editingPrompt || !editingPrompt.title.trim() || !editingPrompt.content.trim()) return;
    setBusy(`prompt:${editingPrompt.id}`);
    setError('');
    try {
      const res = await fetch(`/api/prompts/${editingPrompt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPrompt),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '프롬프트 수정에 실패했습니다.');
        return;
      }
      const nextPrompt = {
        id: data.prompt.id,
        title: data.prompt.title,
        content: data.prompt.content,
        targetAudience: data.prompt.targetAudience ?? undefined,
        hskLevel: data.prompt.hskLevel ?? undefined,
      };
      setPrompts((prev) => prev.map((prompt) => (prompt.id === nextPrompt.id ? nextPrompt : prompt)));
      if (selectedPromptId === nextPrompt.id) {
        setPromptContent(nextPrompt.content);
        setTargetAudience(nextPrompt.targetAudience || '');
        setHskLevel(nextPrompt.hskLevel || '');
      }
      setEditingPrompt(null);
    } catch {
      setError('프롬프트 수정 중 오류가 발생했습니다.');
    } finally {
      setBusy(null);
    }
  };

  const deletePrompt = async (id: string) => {
    if (!confirm('이 프롬프트를 삭제하시겠습니까?')) return;
    setBusy(`prompt-delete:${id}`);
    setError('');
    try {
      const res = await fetch(`/api/prompts/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || '프롬프트 삭제에 실패했습니다.');
        return;
      }
      setPrompts((prev) => prev.filter((prompt) => prompt.id !== id));
      if (selectedPromptId === id) setSelectedPromptId('');
    } finally {
      setBusy(null);
    }
  };

  const startEditPlan = async (plan: SavedPlan) => {
    setBusy(`plan-load:${plan.id}`);
    setError('');
    try {
      const res = await fetch(`/api/lesson-plans/${plan.id}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '수업 계획서를 불러오지 못했습니다.');
        return;
      }
      const content = normalizeDraftContent(data.plan.content, data.plan.title);
      if (!content) {
        setError('이 수업 계획서 content를 구조화된 편집기로 불러올 수 없습니다.');
        return;
      }
      setEditingPlan({
        id: plan.id,
        title: data.plan.title,
        targetAudience: data.plan.targetAudience || '',
        hskLevel: data.plan.hskLevel || '',
        content,
      });
    } catch {
      setError('수업 계획서 조회 중 오류가 발생했습니다.');
    } finally {
      setBusy(null);
    }
  };

  const updateEditingContent = (patch: Partial<LessonPlanDraft>) => {
    if (!editingPlan) return;
    setEditingPlan({ ...editingPlan, content: { ...editingPlan.content, ...patch } });
  };

  const updateEditingSection = (index: number, patch: Partial<LessonSection>) => {
    if (!editingPlan) return;
    const sections = [...editingPlan.content.sections];
    sections[index] = { ...sections[index], ...patch };
    updateEditingContent({ sections });
  };

  const addEditingSection = () => {
    if (!editingPlan) return;
    updateEditingContent({
      sections: [...editingPlan.content.sections, { title: '새 단계', duration: '', activities: [], teacherNotes: '' }],
    });
  };

  const removeEditingSection = (index: number) => {
    if (!editingPlan || editingPlan.content.sections.length <= 1) return;
    updateEditingContent({
      sections: editingPlan.content.sections.filter((_, sectionIndex) => sectionIndex !== index),
    });
  };

  const moveEditingSection = (index: number, direction: -1 | 1) => {
    if (!editingPlan) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= editingPlan.content.sections.length) return;
    const sections = [...editingPlan.content.sections];
    [sections[index], sections[nextIndex]] = [sections[nextIndex], sections[index]];
    updateEditingContent({ sections });
  };

  const updatePlan = async () => {
    if (!editingPlan || !editingPlan.title.trim()) return;
    setBusy(`plan:${editingPlan.id}`);
    setError('');
    try {
      const content = { ...editingPlan.content, title: editingPlan.title.trim() };
      const res = await fetch(`/api/lesson-plans/${editingPlan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingPlan.title,
          targetAudience: editingPlan.targetAudience || null,
          hskLevel: editingPlan.hskLevel || null,
          content,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '수업 계획서 수정에 실패했습니다.');
        return;
      }
      const nextPlan = {
        id: data.plan.id,
        title: data.plan.title,
        targetAudience: data.plan.targetAudience ?? undefined,
        hskLevel: data.plan.hskLevel ?? undefined,
        updatedAt: new Date(data.plan.updatedAt).toISOString(),
      };
      setPlans((prev) => prev.map((plan) => (plan.id === nextPlan.id ? nextPlan : plan)));
      setEditingPlan(null);
    } catch {
      setError('수업 계획서 수정 중 오류가 발생했습니다.');
    } finally {
      setBusy(null);
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm('이 수업 계획서를 삭제하시겠습니까?')) return;
    setBusy(`plan-delete:${id}`);
    setError('');
    try {
      const res = await fetch(`/api/lesson-plans/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || '수업 계획서 삭제에 실패했습니다.');
        return;
      }
      setPlans((prev) => prev.filter((plan) => plan.id !== id));
      if (savedPlanId === id) setSavedPlanId(null);
      if (editingPlan?.id === id) setEditingPlan(null);
    } finally {
      setBusy(null);
    }
  };

  const toggleSection = (index: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4A5568', marginBottom: '0.25rem' }}>AI 수업 계획서 생성기</h1>
        <p style={{ color: '#A0AEC0', fontSize: '0.95rem' }}>프롬프트를 작성하거나 저장된 프롬프트를 선택해 구조화된 수업 계획서를 생성합니다.</p>
      </div>

      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        {prompts.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#718096', marginBottom: '0.35rem' }}>저장된 프롬프트 불러오기</label>
            <select className="input" value={selectedPromptId} onChange={(event) => selectPrompt(event.target.value)}>
              <option value="">-- 새 프롬프트 작성 --</option>
              {prompts.map((prompt) => <option key={prompt.id} value={prompt.id}>{prompt.title}</option>)}
            </select>
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#718096', marginBottom: '0.35rem' }}>수업 요청 프롬프트 *</label>
          <textarea
            className="input"
            value={promptContent}
            onChange={(event) => setPromptContent(event.target.value)}
            placeholder="예: HSK3 수준 학생들을 위한 50분 말하기 수업을 설계해 주세요."
            style={{ minHeight: '120px', resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#718096', marginBottom: '0.35rem' }}>대상 수준 *</label>
            <AudienceSelector value={targetAudience} onChange={setTargetAudience} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#718096', marginBottom: '0.35rem' }}>HSK 수준 (선택)</label>
            <select className="input" value={hskLevel} onChange={(event) => setHskLevel(event.target.value)}>
              {HSK_LEVELS.map((level) => <option key={level} value={level}>{level || '선택 안 함'}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={generate} disabled={loading || !promptContent.trim() || !targetAudience} style={{ flex: 1 }}>
            {loading ? <><Loader2 size={18} className="spin" /> AI 생성 중...</> : <><Sparkles size={18} /> 수업 계획서 생성</>}
          </button>
          <button className="btn btn-secondary" onClick={() => setShowPromptSave(!showPromptSave)} disabled={!promptContent.trim()} style={{ fontSize: '0.875rem' }}>
            <Plus size={16} /> 프롬프트 저장
          </button>
        </div>

        {showPromptSave && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#F8FAFC', borderRadius: 'var(--radius-md)', border: '1px solid #E2E8F0' }}>
            <input className="input" value={newPromptTitle} onChange={(event) => setNewPromptTitle(event.target.value)} placeholder="프롬프트 이름" style={{ marginBottom: '0.5rem' }} />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" onClick={savePrompt} disabled={savingPrompt || !newPromptTitle.trim()} style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
                {savingPrompt ? <Loader2 size={14} className="spin" /> : '저장'}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowPromptSave(false)} style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>취소</button>
            </div>
          </div>
        )}
      </div>

      {draft && (
        <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#718096', marginBottom: '0.35rem' }}>수업 제목</label>
              <input className="input" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} style={{ fontSize: '1.1rem', fontWeight: 700 }} />
            </div>
            {!savedPlanId ? (
              <button className="btn btn-primary" onClick={savePlan} disabled={saving} style={{ marginTop: '1.5rem' }}>
                {saving ? <><Loader2 size={16} className="spin" /> 저장 중...</> : <><Save size={16} /> 저장</>}
              </button>
            ) : (
              <span style={{ color: '#166534', fontWeight: 700, marginTop: '2rem' }}>저장됨</span>
            )}
          </div>

          {draft.objectives.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#4A5568', marginBottom: '0.5rem' }}>학습 목표</h3>
              <ul style={{ paddingLeft: '1.25rem', color: '#4A5568', lineHeight: 1.8 }}>
                {draft.objectives.map((objective, index) => <li key={index}>{objective}</li>)}
              </ul>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem', fontSize: '0.9rem', color: '#718096', flexWrap: 'wrap' }}>
            {draft.duration && <span>소요 시간: {draft.duration}</span>}
            {draft.prerequisites && <span>선수 요건: {draft.prerequisites}</span>}
          </div>

          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#4A5568', marginBottom: '0.75rem' }}>수업 구성</h3>
          <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {draft.sections.map((section, index) => (
              <div key={index} style={{ border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <button
                  onClick={() => toggleSection(index)}
                  style={{ width: '100%', padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', border: 'none', cursor: 'pointer', fontWeight: 700, color: '#4A5568' }}
                >
                  <span>{section.title} {section.duration && <span style={{ color: '#718096', fontWeight: 500 }}>({section.duration})</span>}</span>
                  {expandedSections.has(index) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {expandedSections.has(index) && (
                  <div style={{ padding: '1rem' }}>
                    <ul style={{ paddingLeft: '1.25rem', color: '#4A5568', lineHeight: 1.8, marginBottom: section.teacherNotes ? '0.75rem' : 0 }}>
                      {section.activities.map((activity, activityIndex) => <li key={activityIndex}>{activity}</li>)}
                    </ul>
                    {section.teacherNotes && (
                      <div style={{ fontSize: '0.85rem', color: '#7C3AED', background: '#F5F3FF', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
                        교사 유의사항: {section.teacherNotes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {draft.materials.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#4A5568', marginBottom: '0.5rem' }}>필요 자료</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {draft.materials.map((material, index) => (
                  <span key={index} style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.85rem' }}>{material}</span>
                ))}
              </div>
            </div>
          )}

          {draft.assessment && (
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#4A5568', marginBottom: '0.35rem' }}>평가 방법</h3>
              <p style={{ color: '#4A5568' }}>{draft.assessment}</p>
            </div>
          )}

          {draft.homework && (
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#4A5568', marginBottom: '0.35rem' }}>과제</h3>
              <p style={{ color: '#4A5568' }}>{draft.homework}</p>
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4A5568', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Pencil size={18} /> 저장된 프롬프트 ({prompts.length})
          </h2>
          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0' }} />
            <input className="input" value={promptSearch} onChange={(event) => setPromptSearch(event.target.value)} placeholder="프롬프트 검색" style={{ paddingLeft: '2rem', fontSize: '0.85rem' }} />
          </div>
        </div>
        {filteredPrompts.length === 0 ? (
          <p style={{ color: '#A0AEC0' }}>{prompts.length === 0 ? '저장된 프롬프트가 없습니다.' : '검색 결과가 없습니다.'}</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {filteredPrompts.map((prompt) => (
              <div key={prompt.id} style={{ border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                {editingPrompt?.id === prompt.id ? (
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <input className="input" value={editingPrompt.title} onChange={(event) => setEditingPrompt({ ...editingPrompt, title: event.target.value })} />
                    <textarea className="input" value={editingPrompt.content} onChange={(event) => setEditingPrompt({ ...editingPrompt, content: event.target.value })} style={{ minHeight: '100px', resize: 'vertical' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: '0.75rem' }}>
                      <AudienceSelector value={editingPrompt.targetAudience || ''} onChange={(value) => setEditingPrompt({ ...editingPrompt, targetAudience: value })} />
                      <select className="input" value={editingPrompt.hskLevel || ''} onChange={(event) => setEditingPrompt({ ...editingPrompt, hskLevel: event.target.value })}>
                        {HSK_LEVELS.map((level) => <option key={level} value={level}>{level || '선택 안 함'}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button className="btn btn-secondary" onClick={() => setEditingPrompt(null)}><X size={14} /> 취소</button>
                      <button className="btn btn-primary" onClick={updatePrompt} disabled={busy !== null}>
                        {busy === `prompt:${prompt.id}` ? <Loader2 size={14} className="spin" /> : <Save size={14} />} 저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#2D3748' }}>{prompt.title}</div>
                      <div style={{ color: '#718096', fontSize: '0.85rem', marginTop: '0.25rem' }}>{prompt.content.slice(0, 120)}{prompt.content.length > 120 ? '...' : ''}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.45rem' }}>
                      <button className="btn btn-secondary" onClick={() => setEditingPrompt(prompt)} style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem' }}><Pencil size={14} /> 수정</button>
                      <button className="btn btn-secondary" onClick={() => duplicatePrompt(prompt)} disabled={busy !== null} style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem' }}>
                        {busy === `prompt-copy:${prompt.id}` ? <Loader2 size={14} className="spin" /> : <Copy size={14} />} 복제
                      </button>
                      <button onClick={() => deletePrompt(prompt.id)} disabled={busy !== null} style={{ padding: '0.4rem', background: 'transparent', border: 'none', color: '#E53E3E', cursor: 'pointer' }}>
                        {busy === `prompt-delete:${prompt.id}` ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4A5568', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} /> 저장된 수업 계획서 ({plans.length})
          </h2>
          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0' }} />
            <input className="input" value={planSearch} onChange={(event) => setPlanSearch(event.target.value)} placeholder="계획서 검색" style={{ paddingLeft: '2rem', fontSize: '0.85rem' }} />
          </div>
        </div>
        {filteredPlans.length === 0 ? (
          <div className="card" style={{ padding: '2rem', color: '#A0AEC0', textAlign: 'center' }}>{plans.length === 0 ? '저장된 수업 계획서가 없습니다.' : '검색 결과가 없습니다.'}</div>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {filteredPlans.map((plan) => (
              <div key={plan.id} className="card" style={{ padding: '1.25rem' }}>
                {editingPlan?.id === plan.id ? (
                  <div style={{ display: 'grid', gap: '0.85rem' }}>
                    <input className="input" value={editingPlan.title} onChange={(event) => setEditingPlan({ ...editingPlan, title: event.target.value })} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: '0.75rem' }}>
                      <AudienceSelector value={editingPlan.targetAudience} onChange={(value) => setEditingPlan({ ...editingPlan, targetAudience: value })} />
                      <select className="input" value={editingPlan.hskLevel} onChange={(event) => setEditingPlan({ ...editingPlan, hskLevel: event.target.value })}>
                        {HSK_LEVELS.map((level) => <option key={level} value={level}>{level || '선택 안 함'}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: '0.75rem' }}>
                      <input className="input" value={editingPlan.content.duration} onChange={(event) => updateEditingContent({ duration: event.target.value })} placeholder="소요 시간" />
                      <input className="input" value={editingPlan.content.prerequisites || ''} onChange={(event) => updateEditingContent({ prerequisites: event.target.value })} placeholder="선수 요건" />
                    </div>
                    <textarea className="input" value={editingPlan.content.objectives.join('\n')} onChange={(event) => updateEditingContent({ objectives: splitLines(event.target.value) })} placeholder="학습 목표 (줄바꿈으로 구분)" style={{ minHeight: 90, resize: 'vertical' }} />
                    <textarea className="input" value={editingPlan.content.materials.join('\n')} onChange={(event) => updateEditingContent({ materials: splitLines(event.target.value) })} placeholder="필요 자료 (줄바꿈으로 구분)" style={{ minHeight: 80, resize: 'vertical' }} />

                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#4A5568' }}>수업 단계</h4>
                        <button type="button" className="btn btn-secondary" onClick={addEditingSection} style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem' }}><Plus size={14} /> 단계 추가</button>
                      </div>
                      {editingPlan.content.sections.map((section, index) => (
                        <div key={index} style={{ border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '0.85rem', display: 'grid', gap: '0.55rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px auto', gap: '0.55rem', alignItems: 'center' }}>
                            <input className="input" value={section.title} onChange={(event) => updateEditingSection(index, { title: event.target.value })} placeholder="단계 제목" />
                            <input className="input" value={section.duration} onChange={(event) => updateEditingSection(index, { duration: event.target.value })} placeholder="시간" />
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button type="button" className="btn btn-secondary" onClick={() => moveEditingSection(index, -1)} disabled={index === 0} style={{ padding: '0.45rem' }}><ArrowUp size={14} /></button>
                              <button type="button" className="btn btn-secondary" onClick={() => moveEditingSection(index, 1)} disabled={index === editingPlan.content.sections.length - 1} style={{ padding: '0.45rem' }}><ArrowDown size={14} /></button>
                              <button type="button" className="btn btn-secondary" onClick={() => removeEditingSection(index)} disabled={editingPlan.content.sections.length <= 1} style={{ padding: '0.45rem', color: '#B91C1C' }}><Trash2 size={14} /></button>
                            </div>
                          </div>
                          <textarea className="input" value={section.activities.join('\n')} onChange={(event) => updateEditingSection(index, { activities: splitLines(event.target.value) })} placeholder="활동 (줄바꿈으로 구분)" style={{ minHeight: 80, resize: 'vertical' }} />
                          <textarea className="input" value={section.teacherNotes || ''} onChange={(event) => updateEditingSection(index, { teacherNotes: event.target.value })} placeholder="교사 유의사항" style={{ minHeight: 70, resize: 'vertical' }} />
                        </div>
                      ))}
                    </div>

                    <textarea className="input" value={editingPlan.content.assessment} onChange={(event) => updateEditingContent({ assessment: event.target.value })} placeholder="평가 방법" style={{ minHeight: 80, resize: 'vertical' }} />
                    <textarea className="input" value={editingPlan.content.homework || ''} onChange={(event) => updateEditingContent({ homework: event.target.value })} placeholder="과제" style={{ minHeight: 80, resize: 'vertical' }} />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button className="btn btn-secondary" onClick={() => setEditingPlan(null)}><X size={14} /> 취소</button>
                      <button className="btn btn-primary" onClick={updatePlan} disabled={busy !== null || !editingPlan.title.trim()}>
                        {busy === `plan:${plan.id}` ? <Loader2 size={14} className="spin" /> : <Save size={14} />} 저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#2D3748' }}>{plan.title}</div>
                      <div style={{ fontSize: '0.8rem', color: '#A0AEC0', marginTop: '0.25rem' }}>
                        {plan.targetAudience && <span style={{ marginRight: '0.75rem' }}>{plan.targetAudience}</span>}
                        {plan.hskLevel && <span style={{ marginRight: '0.75rem' }}>{plan.hskLevel}</span>}
                        {new Date(plan.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.45rem' }}>
                      <button className="btn btn-secondary" onClick={() => startEditPlan(plan)} disabled={busy !== null} style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem' }}>
                        {busy === `plan-load:${plan.id}` ? <Loader2 size={14} className="spin" /> : <Pencil size={14} />} 수정
                      </button>
                      <button onClick={() => deletePlan(plan.id)} disabled={busy !== null} style={{ padding: '0.4rem', background: 'transparent', border: 'none', color: '#E53E3E', cursor: 'pointer' }}>
                        {busy === `plan-delete:${plan.id}` ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
