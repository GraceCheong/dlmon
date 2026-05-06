'use client';

import { useState } from 'react';
import {
  Calendar,
  Edit3,
  Check,
  Plus,
  ChevronDown,
  ChevronUp,
  Target,
  X,
  Loader2,
  Save,
  Trash2,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';

interface Week {
  week: number;
  topic: string;
  objectives: string;
  activities: string;
  assessment: string;
}

const blankWeek = (n: number): Week => ({
  week: n,
  topic: '',
  objectives: '',
  activities: '',
  assessment: '',
});

export default function CurriculumEditor({
  courseId,
  initialData,
}: {
  courseId: string;
  initialData: Week[];
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [weeks, setWeeks] = useState<Week[]>(initialData);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(initialData[0]?.week ?? null);
  const [creatingLesson, setCreatingLesson] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<Week | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const persistWeeks = async (next: Week[]): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/curriculum/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeks: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || '저장에 실패했습니다.');
        return false;
      }
      // Server normalizes week numbering — use that as the source of truth.
      setWeeks(data.weeks ?? next);
      router.refresh();
      return true;
    } catch {
      setSaveError('네트워크 오류로 저장에 실패했습니다.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (weekNum: number) => {
    setExpandedWeek(expandedWeek === weekNum ? null : weekNum);
  };

  const openEdit = (index: number) => {
    setEditingIndex(index);
    setDraft({ ...weeks[index] });
  };

  const closeEdit = () => {
    setEditingIndex(null);
    setDraft(null);
    setSaveError(null);
  };

  const saveEdit = async () => {
    if (editingIndex === null || !draft) return;
    const next = weeks.map((w, i) => (i === editingIndex ? { ...draft } : w));
    if (await persistWeeks(next)) closeEdit();
  };

  const handleAddWeek = async () => {
    const next = [...weeks, blankWeek(weeks.length + 1)];
    const ok = await persistWeeks(next);
    if (ok) {
      // Open the editor on the newly added week so the user can fill it in.
      setEditingIndex(next.length - 1);
      setDraft(next[next.length - 1]);
      setExpandedWeek(next.length);
    }
  };

  const handleRemoveWeek = async (index: number) => {
    if (!window.confirm(`${weeks[index].week}주차를 정말 삭제하시겠습니까?`)) return;
    const next = weeks.filter((_, i) => i !== index);
    await persistWeeks(next);
    closeEdit();
  };

  const handleCreateLesson = async (week: Week) => {
    setCreatingLesson(week.week);
    try {
      const response = await fetch('/api/lessons/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          title: `${week.week}주차: ${week.topic || '미정'}`,
          order: week.week,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        router.push(`/editor/${data.id}`);
      }
    } catch (error) {
      console.error('Failed to create lesson:', error);
    } finally {
      setCreatingLesson(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {weeks.map((week, index) => (
        <div
          key={`${week.week}-${index}`}
          className="card"
          style={{
            padding: '0',
            overflow: 'hidden',
            border: 'none',
            boxShadow:
              expandedWeek === week.week
                ? '0 12px 30px rgba(152, 216, 170, 0.15)'
                : '0 4px 12px rgba(0,0,0,0.03)',
            transition: 'all 0.3s ease',
          }}
        >
          {/* Week Header */}
          <div
            onClick={() => toggleExpand(week.week)}
            style={{
              padding: '1.5rem 2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              background: expandedWeek === week.week ? 'var(--primary-light)' : 'white',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '1.25rem',
                  background: expandedWeek === week.week ? 'var(--primary)' : '#F1F5F9',
                  color: expandedWeek === week.week ? 'white' : '#A0AEC0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  boxShadow:
                    expandedWeek === week.week ? '0 8px 16px rgba(152, 216, 170, 0.3)' : 'none',
                }}
              >
                {week.week}
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#4A5568' }}>
                  {week.topic || `${week.week}주차 (제목 미정)`}
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#A0AEC0', fontWeight: 600 }}>
                  {week.week}
                  {t.plan.week} {t.plan.topic}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit(index);
                }}
                className="flex-center"
                title="수정"
                style={{
                  color: '#CBD5E0',
                  background: 'white',
                  padding: '0.6rem',
                  borderRadius: '1rem',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Edit3 size={18} />
              </button>
              {expandedWeek === week.week ? (
                <ChevronUp size={24} color="var(--primary)" />
              ) : (
                <ChevronDown size={24} color="#CBD5E0" />
              )}
            </div>
          </div>

          {/* Week Details */}
          {expandedWeek === week.week && (
            <div
              style={{
                padding: '2.5rem 2rem 2.5rem 6.5rem',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '3rem',
                background: 'white',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                <DetailSection
                  icon={<Target size={18} />}
                  title={t.plan.objectives}
                  content={week.objectives || '학습 목표가 아직 작성되지 않았습니다.'}
                  color="var(--primary)"
                />
                <DetailSection
                  icon={<Calendar size={18} />}
                  title={t.plan.activities}
                  content={week.activities || '주요 활동이 아직 작성되지 않았습니다.'}
                  color="var(--secondary)"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <DetailSection
                  icon={<Check size={18} />}
                  title={t.plan.assessment}
                  content={week.assessment || '평가 방법이 아직 작성되지 않았습니다.'}
                  color="#CE93D8"
                />
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '0.875rem' }}
                    onClick={() => openEdit(index)}
                  >
                    {t.plan.edit}
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '0.875rem' }}
                    onClick={() => handleCreateLesson(week)}
                    disabled={creatingLesson === week.week}
                  >
                    {creatingLesson === week.week ? t.common.loading : t.plan.createLesson}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={handleAddWeek}
        disabled={saving}
        className="btn"
        style={{
          margin: '2.5rem auto',
          padding: '1rem 3rem',
          width: 'fit-content',
          border: '3px dashed #E2E8F0',
          background: 'white',
          color: '#A0AEC0',
          fontWeight: 700,
          fontSize: '1.1rem',
          borderRadius: '2rem',
          cursor: 'pointer',
        }}
      >
        {saving ? <Loader2 size={20} className="spin" /> : <Plus size={24} />}{' '}
        {weeks.length + 1} {t.plan.addWeek}
      </button>

      {saveError && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            background: '#FEF2F2',
            color: '#991B1B',
            padding: '1rem 1.5rem',
            borderRadius: '0.75rem',
            boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
            fontWeight: 600,
            zIndex: 9998,
          }}
        >
          {saveError}
        </div>
      )}

      {/* Edit modal */}
      {editingIndex !== null && draft && (
        <div
          onClick={() => !saving && closeEdit()}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              padding: '2.5rem',
              borderRadius: '2rem',
              maxWidth: '720px',
              width: '94%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4A5568' }}>
                {draft.week}주차 편집
              </h2>
              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                style={{ background: 'transparent', border: 'none', color: '#A0AEC0', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="label">주제 (Topic)</label>
                <input
                  type="text"
                  className="input"
                  value={draft.topic}
                  onChange={(e) => setDraft({ ...draft, topic: e.target.value })}
                />
              </div>
              <div>
                <label className="label">학습 목표 (Objectives)</label>
                <textarea
                  className="input"
                  style={{ minHeight: 90, resize: 'vertical' }}
                  value={draft.objectives}
                  onChange={(e) => setDraft({ ...draft, objectives: e.target.value })}
                />
              </div>
              <div>
                <label className="label">주요 활동 (Activities)</label>
                <textarea
                  className="input"
                  style={{ minHeight: 90, resize: 'vertical' }}
                  value={draft.activities}
                  onChange={(e) => setDraft({ ...draft, activities: e.target.value })}
                />
              </div>
              <div>
                <label className="label">평가 (Assessment)</label>
                <textarea
                  className="input"
                  style={{ minHeight: 90, resize: 'vertical' }}
                  value={draft.assessment}
                  onChange={(e) => setDraft({ ...draft, assessment: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => handleRemoveWeek(editingIndex)}
                disabled={saving}
                className="btn"
                style={{ background: '#FEF2F2', color: '#991B1B', border: 'none' }}
              >
                <Trash2 size={16} /> 주차 삭제
              </button>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeEdit}
                  disabled={saving}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={saveEdit}
                  disabled={saving}
                >
                  {saving ? <><Loader2 size={16} className="spin" /> 저장 중...</> : <><Save size={16} /> 저장</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .label {
          display: block;
          font-size: 0.9rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: #718096;
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function DetailSection({
  icon,
  title,
  content,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  content: string;
  color: string;
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          color,
          fontSize: '0.85rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '0.75rem',
        }}
      >
        <div style={{ background: `${color}15`, padding: '0.4rem', borderRadius: '0.75rem' }}>{icon}</div>
        {title}
      </div>
      <p style={{ fontSize: '1.05rem', lineHeight: '1.7', color: '#718096', fontWeight: 500 }}>{content}</p>
    </div>
  );
}
