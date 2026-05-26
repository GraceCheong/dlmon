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
  Award,
  Paperclip,
  Upload,
  ExternalLink,
  File as FileIcon,
  Eye,
  GripVertical,
  PenLine,
  Trophy,
} from 'lucide-react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';

export interface Week {
  week: number;
  topic: string;
  unit?: string;
  objectives: string;
  activities: string;
  assessment: string;
  type?: 'lesson' | 'midterm' | 'final';
}

export interface AssignmentAttachmentSummary {
  id: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  conversionStatus: string;
  description: string | null;
  createdAt: string;
}

export interface AssignmentSummary {
  id: string;
  lessonId: string;
  title: string;
  type: string;
  prompt: string;
  dueDate: string | null;
  hskLevel: string | null;
  targetAudience: string | null;
  attachments: AssignmentAttachmentSummary[];
}

export interface CourseLessonSummary {
  id: string;
  title: string;
  order: number;
  status: string;
  slug: string;
  blockCount: number;
  updatedAt: string;
  assignments: AssignmentSummary[];
}

export type UploadedFileOption = AssignmentAttachmentSummary;

interface AssignmentDraft {
  title: string;
  type: string;
  prompt: string;
  dueDate: string;
  hskLevel: string;
  targetAudience: string;
  attachmentIds: string[];
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
  initialLessons,
  initialFiles,
}: {
  courseId: string;
  initialData: Week[];
  initialLessons: CourseLessonSummary[];
  initialFiles: UploadedFileOption[];
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [weeks, setWeeks] = useState<Week[]>(initialData);
  const [lessons, setLessons] = useState<CourseLessonSummary[]>(initialLessons);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(initialData[0]?.week ?? null);
  const [creatingLesson, setCreatingLesson] = useState<number | null>(null);
  const [assignmentModal, setAssignmentModal] = useState<{ week: Week; assignment?: AssignmentSummary } | null>(null);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [availableFiles, setAvailableFiles] = useState<UploadedFileOption[]>(initialFiles);
  const [filesLoading, setFilesLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<Week | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [planEditOpen, setPlanEditOpen] = useState(false);

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
    if (!window.confirm(`${weeks[index].week}회차를 정말 삭제하시겠습니까?`)) return;
    const next = weeks.filter((_, i) => i !== index);
    await persistWeeks(next);
    closeEdit();
  };

  const handleCreateLesson = async (week: Week) => {
    const existing = findLessonForWeek(week);
    if (existing) {
      router.push(`/editor/${existing.id}`);
      return;
    }

    setCreatingLesson(week.week);
    try {
      const response = await fetch('/api/lessons/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          title: `${week.week}회차: ${week.topic || '미정'}`,
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

  const findLessonForWeek = (week: Week) => lessons.find((lesson) => lesson.order === week.week);

  const fetchAvailableFiles = async () => {
    setFilesLoading(true);
    try {
      const res = await fetch('/api/files');
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAvailableFiles((data.files ?? []).map((file: UploadedFileOption) => ({
          ...file,
          createdAt: String(file.createdAt),
        })));
      }
    } finally {
      setFilesLoading(false);
    }
  };

  const openAssignmentModal = (week: Week, assignment?: AssignmentSummary) => {
    setAssignmentModal({ week, assignment });
    setAssignmentError(null);
    void fetchAvailableFiles();
  };

  const ensureLessonForWeek = async (week: Week): Promise<CourseLessonSummary | null> => {
    const existing = findLessonForWeek(week);
    if (existing) return existing;

    setCreatingLesson(week.week);
    try {
      const response = await fetch('/api/lessons/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          title: `${week.week}회차: ${week.topic || '미정'}`,
          order: week.week,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAssignmentError(data.error || '연계 수업 생성에 실패했습니다.');
        return null;
      }
      const lesson = {
        id: data.id,
        title: data.title ?? `${week.week}회차: ${week.topic || '미정'}`,
        order: data.order ?? week.week,
        status: data.status ?? 'draft',
        slug: data.slug ?? '',
        blockCount: 0,
        updatedAt: new Date().toISOString(),
        assignments: [],
      };
      setLessons((prev) => [...prev, lesson].sort((a, b) => a.order - b.order));
      return lesson;
    } catch {
      setAssignmentError('연계 수업 생성 중 네트워크 오류가 발생했습니다.');
      return null;
    } finally {
      setCreatingLesson(null);
    }
  };

  const saveAssignment = async (draft: AssignmentDraft) => {
    if (!assignmentModal) return;
    setAssignmentSaving(true);
    setAssignmentError(null);
    try {
      const lesson = await ensureLessonForWeek(assignmentModal.week);
      if (!lesson) return;

      const isEdit = Boolean(assignmentModal.assignment);
      const response = await fetch(
        isEdit ? `/api/assignments/${assignmentModal.assignment?.id}` : '/api/assignments',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...draft,
            lessonId: lesson.id,
            dueDate: draft.dueDate || null,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAssignmentError(data.error || '과제 저장에 실패했습니다.');
        return;
      }

      const saved: AssignmentSummary = {
        id: data.id,
        lessonId: data.lessonId,
        title: data.title,
        type: data.type,
        prompt: data.prompt,
        dueDate: data.dueDate ?? null,
        hskLevel: data.hskLevel ?? null,
        targetAudience: data.targetAudience ?? null,
        attachments: data.attachments ?? [],
      };

      setLessons((prev) => prev.map((item) => {
        if (item.id !== lesson.id) return item;
        const withoutOld = item.assignments.filter((assignment) => assignment.id !== saved.id);
        return { ...item, assignments: [...withoutOld, saved] };
      }));
      setAssignmentModal(null);
      router.refresh();
    } catch {
      setAssignmentError('과제 저장 중 네트워크 오류가 발생했습니다.');
    } finally {
      setAssignmentSaving(false);
    }
  };

  const uploadAssignmentFile = async (file: File): Promise<UploadedFileOption | null> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', '과제 첨부파일');
    try {
      const res = await fetch('/api/files/upload', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAssignmentError(data.error || '파일 업로드에 실패했습니다.');
        return null;
      }
      const uploaded = {
        ...data.file,
        createdAt: String(data.file.createdAt),
      } as UploadedFileOption;
      setAvailableFiles((prev) => [uploaded, ...prev]);
      return uploaded;
    } catch {
      setAssignmentError('파일 업로드 중 네트워크 오류가 발생했습니다.');
      return null;
    }
  };

  const handlePlanEditSave = async (newWeeks: Week[]) => {
    if (await persistWeeks(newWeeks)) setPlanEditOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 전체 편집 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.25rem' }}>
        <button
          type="button"
          onClick={() => setPlanEditOpen(true)}
          className="btn btn-secondary"
          style={{ padding: '0.6rem 1.1rem', fontSize: '0.9rem', fontWeight: 700 }}
        >
          <PenLine size={16} /> 수업 계획 전체 편집
        </button>
      </div>

      {weeks.map((week, index) => {
        const isExam = week.type === 'midterm' || week.type === 'final';
        const isMidterm = week.type === 'midterm';
        const isFinal = week.type === 'final';
        return (
        <div
          key={`${week.week}-${index}`}
          className="card"
          style={{
            padding: '0',
            overflow: 'hidden',
            border: isExam ? `2px solid ${isMidterm ? '#FED7AA' : '#BBF7D0'}` : 'none',
            boxShadow:
              expandedWeek === week.week
                ? '0 12px 30px rgba(152, 216, 170, 0.15)'
                : '0 4px 12px rgba(0,0,0,0.03)',
            transition: 'all 0.3s ease',
          }}
        >
          {/* Week Header */}
          <div
            onClick={() => !isExam && toggleExpand(week.week)}
            style={{
              padding: '1.5rem 2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: isExam ? 'default' : 'pointer',
              background: isExam
                ? (isMidterm ? '#FFF7ED' : '#F0FDF4')
                : expandedWeek === week.week ? 'var(--primary-light)' : 'white',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '1.25rem',
                  background: isExam
                    ? (isMidterm ? '#FB923C' : '#4ADE80')
                    : expandedWeek === week.week ? 'var(--primary)' : '#F1F5F9',
                  color: isExam ? 'white' : expandedWeek === week.week ? 'white' : '#A0AEC0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: isExam ? '0.85rem' : '1.1rem',
                  boxShadow:
                    expandedWeek === week.week ? '0 8px 16px rgba(152, 216, 170, 0.3)' : 'none',
                }}
              >
                {isExam ? <Trophy size={22} /> : week.week}
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: isExam ? (isMidterm ? '#C2410C' : '#15803D') : '#4A5568' }}>
                  {week.topic || `${week.week}회차 (제목 미정)`}
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#A0AEC0', fontWeight: 600 }}>
                  {isExam
                    ? (isMidterm ? '중간고사' : '기말고사')
                    : `${week.week}${t.plan.week} ${t.plan.topic}${week.unit ? ` · ${week.unit}` : ''}`
                  }
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              {!isExam && (expandedWeek === week.week ? (
                <ChevronUp size={24} color="var(--primary)" />
              ) : (
                <ChevronDown size={24} color="#CBD5E0" />
              ))}
            </div>
          </div>

          {/* Week Details */}
          {!isExam && expandedWeek === week.week && (
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
                  action={
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem', flexShrink: 0 }}
                      onClick={() => openEdit(index)}
                    >
                      {t.plan.edit}
                    </button>
                  }
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
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '1rem', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: '#4A5568', marginBottom: '0.35rem' }}>
                        <FileIcon size={17} color="var(--primary)" />
                        수업 콘텐츠
                      </div>
                      {findLessonForWeek(week) ? (
                        <div style={{ color: '#718096', fontSize: '0.82rem', lineHeight: 1.6 }}>
                          {findLessonForWeek(week)?.title}
                          <br />
                          블록 {findLessonForWeek(week)?.blockCount ?? 0}개 · {findLessonForWeek(week)?.status === 'published' ? '공개됨' : '임시 저장'}
                          {findLessonForWeek(week)?.updatedAt ? ` · ${new Date(findLessonForWeek(week)!.updatedAt).toLocaleDateString()}` : ''}
                        </div>
                      ) : (
                        <div style={{ color: '#A0AEC0', fontSize: '0.82rem' }}>
                          아직 저장된 수업 콘텐츠가 없습니다.
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {findLessonForWeek(week)?.status === 'published' && findLessonForWeek(week)?.slug && (
                        <button
                          type="button"
                          className="btn"
                          onClick={() => {
                            const slug = findLessonForWeek(week)?.slug;
                            if (slug) window.open(`/p/${encodeURIComponent(slug)}`, '_blank');
                          }}
                          style={{ padding: '0.45rem 0.7rem', fontSize: '0.78rem', background: 'white', color: '#718096', border: '1px solid #E2E8F0' }}
                        >
                          <Eye size={14} /> 보기
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleCreateLesson(week)}
                        disabled={creatingLesson === week.week}
                        style={{ padding: '0.45rem 0.7rem', fontSize: '0.78rem' }}
                      >
                        {creatingLesson === week.week ? <Loader2 size={14} className="spin" /> : <Edit3 size={14} />}
                        {findLessonForWeek(week) ? '수업 콘텐츠 편집' : '수업 콘텐츠 만들기'}
                      </button>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid #F1F5F9', paddingTop: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4A5568', fontWeight: 800 }}>
                      <Award size={18} color="var(--primary)" />
                      과제
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => openAssignmentModal(week)}
                      disabled={creatingLesson === week.week}
                      style={{ padding: '0.55rem 0.85rem', fontSize: '0.82rem' }}
                    >
                      <Plus size={15} /> 과제 추가
                    </button>
                  </div>

                  {findLessonForWeek(week)?.assignments.length ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {findLessonForWeek(week)?.assignments.map((assignment) => (
                        <div key={assignment.id} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontWeight: 800, color: '#2D3748', fontSize: '0.95rem' }}>{assignment.title}</div>
                              <div style={{ color: '#718096', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                                {assignment.type === 'writing' ? '작문' : '말하기'}
                                {assignment.dueDate ? ` · 마감 ${new Date(assignment.dueDate).toLocaleDateString()}` : ''}
                                {assignment.attachments.length ? ` · 첨부 ${assignment.attachments.length}개` : ''}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => openAssignmentModal(week, assignment)}
                                style={{ padding: '0.4rem 0.65rem', fontSize: '0.78rem' }}
                              >
                                수정
                              </button>
                              <button
                                type="button"
                                className="btn"
                                onClick={() => router.push(`/assignments/${assignment.id}`)}
                                style={{ padding: '0.4rem 0.65rem', fontSize: '0.78rem', background: 'white', color: '#718096', border: '1px solid #E2E8F0' }}
                                title="과제 상세"
                              >
                                <ExternalLink size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#A0AEC0', fontSize: '0.86rem', background: '#F8FAFC', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
                      아직 이 회차에 등록된 과제가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        );
      })}

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

      {assignmentModal && (
        <AssignmentModal
          week={assignmentModal.week}
          assignment={assignmentModal.assignment}
          files={availableFiles}
          filesLoading={filesLoading}
          saving={assignmentSaving}
          error={assignmentError}
          onClose={() => !assignmentSaving && setAssignmentModal(null)}
          onSave={saveAssignment}
          onUpload={uploadAssignmentFile}
        />
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
                {draft.week}회차 편집
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
                <label className="label">단원/챕터명 (Unit)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="예: 제3과, Chapter 2"
                  value={draft.unit || ''}
                  onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                />
              </div>
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
                <Trash2 size={16} /> 회차 삭제
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

      {planEditOpen && (
        <PlanEditModal
          initialWeeks={weeks}
          saving={saving}
          onClose={() => setPlanEditOpen(false)}
          onSave={handlePlanEditSave}
        />
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

// ─── PlanEditModal helpers ───────────────────────────────────────────────────

interface DraftWeek extends Week {
  _uid: string;
}

function SortablePlanItem({
  item,
  num,
  onChange,
  onDelete,
}: {
  item: DraftWeek;
  num: number;
  onChange: (updated: DraftWeek) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item._uid });
  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const isExam = item.type === 'midterm' || item.type === 'final';
  return (
    <div
      ref={setNodeRef}
      style={{
        ...dragStyle,
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        padding: '0.6rem 0.75rem',
        borderRadius: '0.75rem',
        background: isExam
          ? item.type === 'midterm' ? '#FFF7ED' : '#F0FDF4'
          : '#F8FAFC',
        border: `1px solid ${isExam ? (item.type === 'midterm' ? '#FED7AA' : '#BBF7D0') : '#E2E8F0'}`,
        marginBottom: '0.45rem',
      }}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        style={{ background: 'transparent', border: 'none', color: '#CBD5E0', cursor: 'grab', padding: '0.2rem', flexShrink: 0 }}
      >
        <GripVertical size={18} />
      </button>

      <div
        style={{
          width: '1.9rem', height: '1.9rem', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          background: isExam ? (item.type === 'midterm' ? '#F97316' : '#22C55E') : '#E2E8F0',
          color: isExam ? 'white' : '#718096',
          fontSize: '0.72rem', fontWeight: 700,
        }}
      >
        {isExam ? <Trophy size={12} /> : num}
      </div>

      {isExam ? (
        <div style={{ flex: 1, fontWeight: 700, color: item.type === 'midterm' ? '#C2410C' : '#15803D', fontSize: '0.88rem' }}>
          {item.type === 'midterm' ? '중간고사' : '기말고사'}
        </div>
      ) : (
        <>
          <input
            type="text"
            placeholder="단원명"
            value={item.unit || ''}
            onChange={(e) => onChange({ ...item, unit: e.target.value })}
            style={{ width: '110px', padding: '0.35rem 0.55rem', border: '1px solid #E2E8F0', borderRadius: '0.5rem', fontSize: '0.8rem', background: 'white', flexShrink: 0 }}
          />
          <input
            type="text"
            placeholder="주제"
            value={item.topic}
            onChange={(e) => onChange({ ...item, topic: e.target.value })}
            style={{ flex: 1, padding: '0.35rem 0.55rem', border: '1px solid #E2E8F0', borderRadius: '0.5rem', fontSize: '0.8rem', background: 'white' }}
          />
        </>
      )}
      <button
        type="button"
        onClick={onDelete}
        style={{ background: 'transparent', border: 'none', color: '#CBD5E0', cursor: 'pointer', padding: '0.2rem', flexShrink: 0, lineHeight: 0 }}
        title="삭제"
      >
        <X size={15} />
      </button>
    </div>
  );
}

function PlanEditModal({
  initialWeeks,
  saving,
  onClose,
  onSave,
}: {
  initialWeeks: Week[];
  saving: boolean;
  onClose: () => void;
  onSave: (weeks: Week[]) => Promise<void>;
}) {
  const [items, setItems] = useState<DraftWeek[]>(() =>
    initialWeeks.map((w) => ({ ...w, _uid: `uid-${w.week}-${Math.random().toString(36).slice(2)}` }))
  );
  const sensors = useSensors(useSensor(PointerSensor));
  const hasMidterm = items.some((w) => w.type === 'midterm');
  const hasFinal = items.some((w) => w.type === 'final');

  const toggleMidterm = () => {
    if (hasMidterm) {
      setItems((prev) => prev.filter((w) => w.type !== 'midterm'));
    } else {
      const lessonItems = items.filter((w) => w.type !== 'midterm' && w.type !== 'final');
      const insertPos = Math.floor(lessonItems.length / 2);
      const midterm: DraftWeek = { week: 0, topic: '중간고사', unit: '', objectives: '', activities: '', assessment: '', type: 'midterm', _uid: `uid-midterm-${Date.now()}` };
      const withoutFinal = items.filter((w) => w.type !== 'final');
      const finalItem = items.find((w) => w.type === 'final');
      const next = [...withoutFinal.slice(0, insertPos), midterm, ...withoutFinal.slice(insertPos)];
      setItems(finalItem ? [...next, finalItem] : next);
    }
  };

  const toggleFinal = () => {
    if (hasFinal) {
      setItems((prev) => prev.filter((w) => w.type !== 'final'));
    } else {
      const final: DraftWeek = { week: 0, topic: '기말고사', unit: '', objectives: '', activities: '', assessment: '', type: 'final', _uid: `uid-final-${Date.now()}` };
      setItems((prev) => [...prev.filter((w) => w.type !== 'final'), final]);
    }
  };

  const autoAssignUnits = () => {
    let unitIndex = 1;
    setItems((prev) =>
      prev.map((item) => {
        if (item.type === 'midterm' || item.type === 'final') return item;
        const updated = { ...item, unit: `${unitIndex}과` };
        unitIndex++;
        return updated;
      })
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((w) => w._uid === active.id);
        const newIndex = prev.findIndex((w) => w._uid === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    let sessionNum = 0;
    const renumbered: Week[] = items.map((item) => {
      const { _uid, ...rest } = item;
      sessionNum++;
      return { ...rest, week: sessionNum };
    });
    await onSave(renumbered);
  };

  return (
    <div
      onClick={() => !saving && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'white', borderRadius: '1.5rem', width: '94%', maxWidth: '680px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 2rem', borderBottom: '1px solid #E2E8F0' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#4A5568' }}>전체 수업 계획 편집</h2>
          <button type="button" onClick={onClose} disabled={saving} style={{ background: 'transparent', border: 'none', color: '#A0AEC0', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '0.85rem 2rem', borderBottom: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', color: '#C2410C' }}>
            <input type="checkbox" checked={hasMidterm} onChange={toggleMidterm} style={{ width: '1rem', height: '1rem', accentColor: '#F97316' }} />
            <Trophy size={14} /> 중간고사
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', color: '#15803D' }}>
            <input type="checkbox" checked={hasFinal} onChange={toggleFinal} style={{ width: '1rem', height: '1rem', accentColor: '#22C55E' }} />
            <Trophy size={14} /> 기말고사
          </label>
          <button
            type="button" onClick={autoAssignUnits}
            className="btn"
            style={{ marginLeft: 'auto', padding: '0.4rem 0.9rem', fontSize: '0.8rem', background: '#EBF8FF', color: '#2B6CB0', border: 'none' }}
          >
            단원 자동 배치
          </button>
        </div>

        {/* Sortable list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 2rem' }}>
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((w) => w._uid)} strategy={verticalListSortingStrategy}>
              {items.map((item, idx) => {
                const lessonNum = idx + 1;
                return (
                  <SortablePlanItem
                    key={item._uid}
                    item={item}
                    num={lessonNum}
                    onChange={(updated) =>
                      setItems((prev) => prev.map((w) => (w._uid === updated._uid ? updated : w)))
                    }
                    onDelete={() => setItems((prev) => prev.filter((w) => w._uid !== item._uid))}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1.25rem 2rem', borderTop: '1px solid #E2E8F0' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>취소</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 size={16} className="spin" /> 저장 중...</> : <><Save size={16} /> 저장</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailSection({
  icon,
  title,
  content,
  color,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  content: string;
  color: string;
  action?: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
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
            minWidth: 0,
          }}
        >
          <div style={{ background: `${color}15`, padding: '0.4rem', borderRadius: '0.75rem' }}>{icon}</div>
          {title}
        </div>
        {action}
      </div>
      <p style={{ fontSize: '1.05rem', lineHeight: '1.7', color: '#718096', fontWeight: 500 }}>{content}</p>
    </div>
  );
}

function AssignmentModal({
  week,
  assignment,
  files,
  filesLoading,
  saving,
  error,
  onClose,
  onSave,
  onUpload,
}: {
  week: Week;
  assignment?: AssignmentSummary;
  files: UploadedFileOption[];
  filesLoading: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (draft: AssignmentDraft) => Promise<void>;
  onUpload: (file: File) => Promise<UploadedFileOption | null>;
}) {
  const [draft, setDraft] = useState<AssignmentDraft>({
    title: assignment?.title ?? `${week.week}회차 과제`,
    type: assignment?.type ?? 'writing',
    prompt: assignment?.prompt ?? '',
    dueDate: assignment?.dueDate ? assignment.dueDate.slice(0, 10) : '',
    hskLevel: assignment?.hskLevel ?? 'HSK3',
    targetAudience: assignment?.targetAudience ?? '중국어 학습자',
    attachmentIds: assignment?.attachments.map((file) => file.id) ?? [],
  });
  const [uploading, setUploading] = useState(false);

  const toggleAttachment = (fileId: string) => {
    setDraft((prev) => ({
      ...prev,
      attachmentIds: prev.attachmentIds.includes(fileId)
        ? prev.attachmentIds.filter((id) => id !== fileId)
        : [...prev.attachmentIds, fileId],
    }));
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const uploaded = await onUpload(file);
    if (uploaded) {
      setDraft((prev) => ({ ...prev, attachmentIds: [...prev.attachmentIds, uploaded.id] }));
    }
    event.target.value = '';
    setUploading(false);
  };

  const canSubmit = draft.title.trim() && draft.prompt.trim() && !saving && !uploading;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '1.25rem',
          maxWidth: '820px',
          width: '94%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#2D3748' }}>
              {assignment ? '과제 수정' : '과제 생성'}
            </h2>
            <p style={{ color: '#718096', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              {week.week}회차 수업 관리에서 바로 확인하고 수정할 수 있습니다.
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} style={{ background: 'transparent', border: 'none', color: '#A0AEC0', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 180px', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label className="assignment-label">과제명 *</label>
            <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div>
            <label className="assignment-label">유형</label>
            <select className="input" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
              <option value="writing">작문</option>
              <option value="speaking">말하기</option>
            </select>
          </div>
          <div>
            <label className="assignment-label">마감일</label>
            <input className="input" type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />
          </div>
        </div>

        {draft.type === 'writing' && (
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className="assignment-label">HSK 수준</label>
              <select className="input" value={draft.hskLevel} onChange={(e) => setDraft({ ...draft, hskLevel: e.target.value })}>
                {['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'].map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="assignment-label">평가 대상</label>
              <input className="input" value={draft.targetAudience} onChange={(e) => setDraft({ ...draft, targetAudience: e.target.value })} />
            </div>
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label className="assignment-label">과제 지시문 *</label>
          <textarea
            className="input"
            value={draft.prompt}
            onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
            style={{ minHeight: 130, resize: 'vertical' }}
            placeholder="학생에게 보일 과제 지시문을 입력하세요."
          />
        </div>

        <div style={{ border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: '#4A5568' }}>
              <Paperclip size={17} color="var(--primary)" /> 첨부파일
            </div>
            <label className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.82rem', cursor: uploading ? 'not-allowed' : 'pointer' }}>
              {uploading ? <Loader2 size={15} className="spin" /> : <Upload size={15} />} 새 파일 업로드
              <input type="file" accept=".pdf,.hwp,.hwpx" onChange={handleUpload} disabled={uploading || saving} style={{ display: 'none' }} />
            </label>
          </div>

          {filesLoading ? (
            <div style={{ color: '#718096', fontSize: '0.86rem' }}>파일 목록을 불러오는 중...</div>
          ) : files.length === 0 ? (
            <div style={{ color: '#A0AEC0', fontSize: '0.86rem' }}>아직 업로드된 파일이 없습니다.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '0.5rem' }}>
              {files.map((file) => (
                <label
                  key={file.id}
                  style={{
                    display: 'flex',
                    gap: '0.55rem',
                    alignItems: 'flex-start',
                    padding: '0.65rem',
                    borderRadius: 'var(--radius-md)',
                    border: draft.attachmentIds.includes(file.id) ? '1px solid var(--primary)' : '1px solid #E2E8F0',
                    background: draft.attachmentIds.includes(file.id) ? 'var(--primary-light)' : '#F8FAFC',
                    cursor: 'pointer',
                  }}
                >
                  <input type="checkbox" checked={draft.attachmentIds.includes(file.id)} onChange={() => toggleAttachment(file.id)} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 700, color: '#2D3748', fontSize: '0.86rem', overflowWrap: 'anywhere' }}>{file.originalName}</span>
                    <span style={{ color: '#718096', fontSize: '0.76rem' }}>{file.fileType.toUpperCase()} · {Math.round(file.fileSize / 1024)} KB · {file.conversionStatus}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>취소</button>
          <button type="button" className="btn btn-primary" onClick={() => onSave(draft)} disabled={!canSubmit}>
            {saving ? <><Loader2 size={16} className="spin" /> 저장 중...</> : <><Save size={16} /> {assignment ? '변경 저장' : '과제 생성'}</>}
          </button>
        </div>

        <style jsx>{`
          .assignment-label {
            display: block;
            font-size: 0.85rem;
            font-weight: 700;
            color: #718096;
            margin-bottom: 0.4rem;
          }
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  );
}
