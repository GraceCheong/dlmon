'use client';

import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookCopy,
  ChevronDown,
  ChevronRight,
  Globe,
  GlobeOff,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import AudienceSelector, { audienceLabel } from '@/components/shared/AudienceSelector';

interface Template {
  id: string;
  title: string;
  description: string | null;
  type: string;
  targetAudience: string | null;
  hskLevel: string | null;
  sourceType: string;
  updatedAt: string;
  isPublished?: boolean;
}

interface TemplateSection {
  title: string;
  activities: string[];
  resources: string[];
  notes: string;
}

interface TemplateContentDraft {
  overview: string;
  sections: TemplateSection[];
  resources: string[];
  notes: string;
}

interface EditingTemplate {
  id: string;
  title: string;
  description: string;
  targetAudience: string;
  hskLevel: string;
  content: TemplateContentDraft;
  baseContent: Record<string, unknown>;
}

interface CourseOption {
  id: string;
  title: string;
  description: string | null;
  level: string;
  lessonCount: number;
}

interface CourseLesson {
  id: string;
  title: string;
  order: number;
  blocks: { id: string; type: string; summary: string }[];
}

interface CourseDetail {
  id: string;
  title: string;
  description: string | null;
  level: string;
  type: string;
  lessons: CourseLesson[];
}

const HSK_LEVELS = ['', 'HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'];

function splitLines(value: string): string[] {
  return value.split('\n').map((line) => line.trim()).filter(Boolean);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
      .filter(Boolean);
  }
  return typeof value === 'string' ? splitLines(value) : [];
}

function stringField(source: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string') return value;
  }
  return '';
}

function emptyContent(overview = ''): TemplateContentDraft {
  return {
    overview,
    sections: [{ title: '수업 단계', activities: [], resources: [], notes: '' }],
    resources: [],
    notes: '',
  };
}

function normalizeContent(value: unknown, fallbackOverview = ''): { draft: TemplateContentDraft; baseContent: Record<string, unknown> } {
  let raw = value;
  if (typeof value === 'string') {
    try {
      raw = JSON.parse(value);
    } catch {
      return {
        draft: {
          ...emptyContent(value || fallbackOverview),
          notes: '기존 content가 JSON이 아니어서 개요 필드로 옮겼습니다.',
        },
        baseContent: { originalContent: value },
      };
    }
  }

  const source = asRecord(raw) ?? {};
  const rawSections = Array.isArray(source.sections) ? source.sections : [];
  const sections = rawSections
    .map((item) => {
      const section = asRecord(item) ?? {};
      return {
        title: stringField(section, 'title', 'name') || '수업 단계',
        activities: toStringArray(section.activities),
        resources: toStringArray(section.resources ?? section.materials),
        notes: stringField(section, 'notes', 'teacherNotes'),
      };
    })
    .filter((section) => section.title || section.activities.length > 0 || section.resources.length > 0 || section.notes);

  return {
    draft: {
      overview: stringField(source, 'overview', 'summary', 'description') || fallbackOverview,
      sections: sections.length > 0 ? sections : emptyContent(fallbackOverview).sections,
      resources: toStringArray(source.resources ?? source.materials),
      notes: stringField(source, 'notes', 'teacherNotes'),
    },
    baseContent: source,
  };
}

function toPersistedContent(editing: EditingTemplate) {
  return {
    ...editing.baseContent,
    format: 'template_content_v1',
    overview: editing.content.overview,
    sections: editing.content.sections,
    resources: editing.content.resources,
    notes: editing.content.notes,
  };
}

export default function TemplatesClient({ initialTemplates }: { initialTemplates: Template[] }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAudience, setNewAudience] = useState('');
  const [newHsk, setNewHsk] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('');
  const [hskFilter, setHskFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [editing, setEditing] = useState<EditingTemplate | null>(null);

  // Course import state
  const [showImport, setShowImport] = useState(false);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [courseDetailLoading, setCourseDetailLoading] = useState(false);
  const [importTitle, setImportTitle] = useState('');
  const [importAudience, setImportAudience] = useState('');
  const [importHsk, setImportHsk] = useState('');
  const [importing, setImporting] = useState(false);

  const typeOptions = useMemo(() => Array.from(new Set(templates.map((template) => template.type).filter(Boolean))).sort(), [templates]);

  const openImport = async () => {
    setShowNew(false);
    setShowImport(true);
    setCoursesLoading(true);
    setError('');
    try {
      const res = await fetch('/api/courses');
      const data = await res.json();
      setCourses(data.courses || []);
    } catch {
      setError('강좌 목록을 불러오지 못했습니다.');
    } finally {
      setCoursesLoading(false);
    }
  };

  const handleCourseSelect = async (courseId: string) => {
    setSelectedCourseId(courseId);
    setCourseDetail(null);
    if (!courseId) return;
    setCourseDetailLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/lessons`);
      const data = await res.json();
      if (res.ok) {
        setCourseDetail(data.course);
        setImportTitle(data.course.title + ' 템플릿');
        setImportHsk('');
      }
    } catch {
      setError('강좌 정보를 불러오지 못했습니다.');
    } finally {
      setCourseDetailLoading(false);
    }
  };

  const blockTypeLabel: Record<string, string> = {
    heading: '제목', text: '텍스트', image: '이미지', video: '동영상',
    'youtube-link': '유튜브', 'youtube-extract': '유튜브 추출', quiz: '퀴즈',
    'text-analyzer': '텍스트 분석', 'file-attachment': '파일첨부',
  };

  const importFromCourse = async () => {
    if (!courseDetail || !importTitle.trim()) return;
    setImporting(true);
    setError('');
    try {
      const sections = courseDetail.lessons.map((lesson) => ({
        title: lesson.title,
        activities: lesson.blocks
          .filter((b) => b.summary)
          .map((b) => `[${blockTypeLabel[b.type] ?? b.type}] ${b.summary}`)
          .concat(lesson.blocks.filter((b) => !b.summary).map((b) => `[${blockTypeLabel[b.type] ?? b.type}]`)),
        resources: [],
        notes: '',
      }));

      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: importTitle,
          description: courseDetail.description || null,
          targetAudience: importAudience || null,
          hskLevel: importHsk || null,
          type: 'lesson',
          sourceType: 'course_import',
          content: {
            format: 'template_content_v1',
            overview: courseDetail.description || '',
            sections,
            resources: [],
            notes: '',
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '가져오기 실패'); return; }
      setTemplates((prev) => [{ ...data.template, isPublished: false }, ...prev]);
      setShowImport(false);
      setSelectedCourseId('');
      setCourseDetail(null);
      setImportTitle('');
      setImportAudience('');
      setImportHsk('');
    } catch {
      setError('강좌 가져오기 중 오류가 발생했습니다.');
    } finally {
      setImporting(false);
    }
  };

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((template) => {
      const matchesSearch = !q || `${template.title} ${template.description || ''} ${template.type} ${template.sourceType}`.toLowerCase().includes(q);
      const matchesAudience = !audienceFilter || template.targetAudience === audienceFilter;
      const matchesHsk = !hskFilter || template.hskLevel === hskFilter;
      const matchesType = !typeFilter || template.type === typeFilter;
      return matchesSearch && matchesAudience && matchesHsk && matchesType;
    });
  }, [audienceFilter, hskFilter, search, templates, typeFilter]);

  const createTemplate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc || null,
          targetAudience: newAudience || null,
          hskLevel: newHsk || null,
          content: emptyContent(newDesc),
          sourceType: 'manual',
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '생성 실패'); return; }
      setTemplates((prev) => [{ ...data.template, isPublished: false }, ...prev]);
      setShowNew(false);
      setNewTitle('');
      setNewDesc('');
      setNewAudience('');
      setNewHsk('');
    } catch {
      setError('네트워크 오류');
    } finally {
      setCreating(false);
    }
  };

  const publish = async (id: string) => {
    setBusy(`publish:${id}`);
    setError('');
    try {
      const res = await fetch(`/api/templates/${id}/publish`, { method: 'POST' });
      if (res.ok) setTemplates((prev) => prev.map((template) => template.id === id ? { ...template, isPublished: true } : template));
      else { const data = await res.json(); setError(data.error || '게시 실패'); }
    } finally { setBusy(null); }
  };

  const unpublish = async (id: string) => {
    setBusy(`unpublish:${id}`);
    setError('');
    try {
      const res = await fetch(`/api/templates/${id}/unpublish`, { method: 'POST' });
      if (res.ok) setTemplates((prev) => prev.map((template) => template.id === id ? { ...template, isPublished: false } : template));
      else { const data = await res.json(); setError(data.error || '게시 취소 실패'); }
    } finally { setBusy(null); }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    setBusy(`delete:${id}`);
    setError('');
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      if (res.ok) setTemplates((prev) => prev.filter((template) => template.id !== id));
      else { const data = await res.json(); setError(data.error || '삭제 실패'); }
    } finally { setBusy(null); }
  };

  const startEdit = async (template: Template) => {
    setBusy(`load:${template.id}`);
    setError('');
    try {
      const res = await fetch(`/api/templates/${template.id}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || '템플릿을 불러오지 못했습니다.'); return; }
      const normalized = normalizeContent(data.template.content, data.template.description || '');
      setEditing({
        id: template.id,
        title: data.template.title,
        description: data.template.description || '',
        targetAudience: data.template.targetAudience || '',
        hskLevel: data.template.hskLevel || '',
        content: normalized.draft,
        baseContent: normalized.baseContent,
      });
    } catch {
      setError('템플릿 조회 중 오류가 발생했습니다.');
    } finally { setBusy(null); }
  };

  const updateEditingContent = (patch: Partial<TemplateContentDraft>) => {
    if (!editing) return;
    setEditing({ ...editing, content: { ...editing.content, ...patch } });
  };

  const updateEditingSection = (index: number, patch: Partial<TemplateSection>) => {
    if (!editing) return;
    const sections = editing.content.sections.map((section, sectionIndex) =>
      sectionIndex === index ? { ...section, ...patch } : section,
    );
    updateEditingContent({ sections });
  };

  const addSection = () => {
    if (!editing) return;
    updateEditingContent({
      sections: [...editing.content.sections, { title: '새 섹션', activities: [], resources: [], notes: '' }],
    });
  };

  const removeSection = (index: number) => {
    if (!editing || editing.content.sections.length <= 1) return;
    updateEditingContent({ sections: editing.content.sections.filter((_, sectionIndex) => sectionIndex !== index) });
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    if (!editing) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= editing.content.sections.length) return;
    const sections = [...editing.content.sections];
    [sections[index], sections[nextIndex]] = [sections[nextIndex], sections[index]];
    updateEditingContent({ sections });
  };

  const saveEdit = async () => {
    if (!editing || !editing.title.trim()) return;
    setBusy(`edit:${editing.id}`);
    setError('');
    try {
      const res = await fetch(`/api/templates/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editing.title,
          description: editing.description || null,
          targetAudience: editing.targetAudience || null,
          hskLevel: editing.hskLevel || null,
          content: toPersistedContent(editing),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '템플릿 수정 실패'); return; }
      setTemplates((prev) => prev.map((template) => template.id === editing.id ? {
        ...template,
        title: data.template.title,
        description: data.template.description ?? null,
        targetAudience: data.template.targetAudience ?? null,
        hskLevel: data.template.hskLevel ?? null,
        updatedAt: new Date(data.template.updatedAt).toISOString(),
      } : template));
      setEditing(null);
    } catch {
      setError('템플릿 수정 중 오류가 발생했습니다.');
    } finally { setBusy(null); }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4A5568', marginBottom: '0.25rem' }}>내 템플릿</h1>
          <p style={{ color: '#A0AEC0', fontSize: '0.95rem' }}>수업 템플릿을 관리하고 마켓플레이스에 공유하세요.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={openImport} style={{ fontSize: '0.875rem' }}>
            <BookCopy size={16} /> 강좌에서 가져오기
          </button>
          <button className="btn btn-primary" onClick={() => { setShowNew(true); setShowImport(false); }}>
            <Plus size={18} /> 새 템플릿
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {showImport && (
        <div
          onClick={() => { setShowImport(false); setSelectedCourseId(''); setCourseDetail(null); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'white', borderRadius: '1.5rem', width: '94%', maxWidth: '640px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 2rem', borderBottom: '1px solid #E2E8F0' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.15rem', color: '#4A5568' }}>강좌에서 템플릿 가져오기</h3>
              <button type="button" onClick={() => { setShowImport(false); setSelectedCourseId(''); setCourseDetail(null); }} style={{ background: 'transparent', border: 'none', color: '#A0AEC0', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
              {coursesLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#A0AEC0', padding: '1rem 0' }}>
                  <Loader2 size={16} className="spin" /> 강좌 목록 불러오는 중...
                </div>
              ) : courses.length === 0 ? (
                <p style={{ color: '#A0AEC0', fontSize: '0.9rem' }}>아직 만든 강좌가 없습니다.</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#718096', display: 'block', marginBottom: '0.35rem' }}>강좌 선택</label>
                    <select
                      className="input"
                      value={selectedCourseId}
                      onChange={(e) => handleCourseSelect(e.target.value)}
                    >
                      <option value="">-- 강좌 선택 --</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title} ({c.level} · {c.lessonCount}개 수업)
                        </option>
                      ))}
                    </select>
                  </div>

                  {courseDetailLoading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#A0AEC0' }}>
                      <Loader2 size={14} className="spin" /> 수업 목록 불러오는 중...
                    </div>
                  )}

                  {courseDetail && (
                    <>
                      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '0.85rem', maxHeight: '220px', overflowY: 'auto' }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4A5568', marginBottom: '0.5rem' }}>
                          수업 구성 ({courseDetail.lessons.length}개)
                        </p>
                        <div style={{ display: 'grid', gap: '0.35rem' }}>
                          {courseDetail.lessons.map((lesson) => (
                            <details key={lesson.id} style={{ fontSize: '0.82rem' }}>
                              <summary style={{ cursor: 'pointer', color: '#4A5568', fontWeight: 600, listStyle: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <ChevronRight size={12} style={{ flexShrink: 0 }} />
                                {lesson.order}. {lesson.title}
                                <span style={{ color: '#A0AEC0', fontWeight: 400 }}>({lesson.blocks.length}개 블록)</span>
                              </summary>
                              {lesson.blocks.length > 0 && (
                                <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem', color: '#718096' }}>
                                  {lesson.blocks.map((b) => (
                                    <li key={b.id}>
                                      <span style={{ fontSize: '0.75rem', background: '#EDF2F7', borderRadius: '4px', padding: '0.1rem 0.4rem', marginRight: '0.35rem' }}>
                                        {blockTypeLabel[b.type] ?? b.type}
                                      </span>
                                      {b.summary || '(내용 없음)'}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </details>
                          ))}
                        </div>
                      </div>

                      <input className="input" value={importTitle} onChange={(e) => setImportTitle(e.target.value)} placeholder="템플릿 제목 *" />
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 150px', gap: '0.75rem' }}>
                        <AudienceSelector value={importAudience} onChange={setImportAudience} />
                        <select className="input" value={importHsk} onChange={(e) => setImportHsk(e.target.value)}>
                          {HSK_LEVELS.map((level) => <option key={level} value={level}>{level || 'HSK 선택'}</option>)}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '1.25rem 2rem', borderTop: '1px solid #E2E8F0' }}>
              <button className="btn btn-secondary" onClick={() => { setShowImport(false); setSelectedCourseId(''); setCourseDetail(null); }}>취소</button>
              {courseDetail && (
                <button
                  className="btn btn-primary"
                  onClick={importFromCourse}
                  disabled={importing || !importTitle.trim()}
                >
                  {importing ? <Loader2 size={16} className="spin" /> : <BookCopy size={16} />}
                  템플릿으로 저장
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showNew && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '2px solid var(--primary)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>새 템플릿 만들기</h3>
          <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
            <input className="input" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="템플릿 제목 *" />
            <textarea className="input" value={newDesc} onChange={(event) => setNewDesc(event.target.value)} placeholder="설명 또는 개요 (선택)" style={{ minHeight: '80px', resize: 'vertical' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 150px', gap: '0.75rem' }}>
              <AudienceSelector value={newAudience} onChange={setNewAudience} />
              <select className="input" value={newHsk} onChange={(event) => setNewHsk(event.target.value)}>
                {HSK_LEVELS.map((level) => <option key={level} value={level}>{level || 'HSK 선택'}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={createTemplate} disabled={creating || !newTitle.trim()}>
              {creating ? <Loader2 size={16} className="spin" /> : '만들기'}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowNew(false)}>취소</button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 170px 130px 130px', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0' }} />
            <input
              className="input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="제목, 설명, 유형 검색"
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
          <AudienceSelector value={audienceFilter} onChange={setAudienceFilter} />
          <select className="input" value={hskFilter} onChange={(event) => setHskFilter(event.target.value)}>
            {HSK_LEVELS.map((level) => <option key={level} value={level}>{level || 'HSK 전체'}</option>)}
          </select>
          <select className="input" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="">유형 전체</option>
            {typeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', color: '#A0AEC0' }}>
          <Globe size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <p>아직 만든 템플릿이 없습니다.</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#A0AEC0' }}>
          <p>검색 결과가 없습니다.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {filteredTemplates.map((template) => (
            <div key={template.id} className="card" style={{ padding: '1.25rem' }}>
              {editing?.id === template.id ? (
                <div style={{ display: 'grid', gap: '0.85rem' }}>
                  <input className="input" value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} placeholder="템플릿 제목" />
                  <textarea className="input" value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} placeholder="설명" style={{ minHeight: '70px', resize: 'vertical' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 150px', gap: '0.75rem' }}>
                    <AudienceSelector value={editing.targetAudience} onChange={(value) => setEditing({ ...editing, targetAudience: value })} />
                    <select className="input" value={editing.hskLevel} onChange={(event) => setEditing({ ...editing, hskLevel: event.target.value })}>
                      {HSK_LEVELS.map((level) => <option key={level} value={level}>{level || 'HSK 선택'}</option>)}
                    </select>
                  </div>
                  <textarea
                    className="input"
                    value={editing.content.overview}
                    onChange={(event) => updateEditingContent({ overview: event.target.value })}
                    placeholder="템플릿 개요"
                    style={{ minHeight: '80px', resize: 'vertical' }}
                  />

                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#4A5568' }}>섹션과 활동</h4>
                      <button type="button" className="btn btn-secondary" onClick={addSection} style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem' }}>
                        <Plus size={14} /> 섹션 추가
                      </button>
                    </div>
                    {editing.content.sections.map((section, index) => (
                      <div key={index} style={{ border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '0.85rem', display: 'grid', gap: '0.55rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '0.55rem', alignItems: 'center' }}>
                          <input className="input" value={section.title} onChange={(event) => updateEditingSection(index, { title: event.target.value })} placeholder="섹션 제목" />
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => moveSection(index, -1)} disabled={index === 0} style={{ padding: '0.45rem' }}><ArrowUp size={14} /></button>
                            <button type="button" className="btn btn-secondary" onClick={() => moveSection(index, 1)} disabled={index === editing.content.sections.length - 1} style={{ padding: '0.45rem' }}><ArrowDown size={14} /></button>
                            <button type="button" className="btn btn-secondary" onClick={() => removeSection(index)} disabled={editing.content.sections.length <= 1} style={{ padding: '0.45rem', color: '#B91C1C' }}><Trash2 size={14} /></button>
                          </div>
                        </div>
                        <textarea className="input" value={section.activities.join('\n')} onChange={(event) => updateEditingSection(index, { activities: splitLines(event.target.value) })} placeholder="활동 목록 (줄바꿈으로 구분)" style={{ minHeight: '90px', resize: 'vertical' }} />
                        <textarea className="input" value={section.resources.join('\n')} onChange={(event) => updateEditingSection(index, { resources: splitLines(event.target.value) })} placeholder="섹션 자료 (줄바꿈으로 구분)" style={{ minHeight: '70px', resize: 'vertical' }} />
                        <textarea className="input" value={section.notes} onChange={(event) => updateEditingSection(index, { notes: event.target.value })} placeholder="교사용 메모" style={{ minHeight: '70px', resize: 'vertical' }} />
                      </div>
                    ))}
                  </div>

                  <textarea className="input" value={editing.content.resources.join('\n')} onChange={(event) => updateEditingContent({ resources: splitLines(event.target.value) })} placeholder="공통 자료 (줄바꿈으로 구분)" style={{ minHeight: '80px', resize: 'vertical' }} />
                  <textarea className="input" value={editing.content.notes} onChange={(event) => updateEditingContent({ notes: event.target.value })} placeholder="전체 메모" style={{ minHeight: '80px', resize: 'vertical' }} />

                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '0.85rem', color: '#4A5568', fontSize: '0.85rem' }}>
                    <strong>마켓 게시 미리보기</strong>
                    <div style={{ marginTop: '0.35rem' }}>
                      {editing.title || '제목 없음'} · {editing.targetAudience ? audienceLabel(editing.targetAudience) : '대상 미선택'} · {editing.hskLevel || 'HSK 미선택'}
                    </div>
                    <div style={{ marginTop: '0.25rem', color: '#718096' }}>
                      게시하면 현재 저장된 제목, 설명, 섹션 내용이 새 스냅샷으로 고정됩니다.
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={() => setEditing(null)} disabled={busy !== null}><X size={14} /> 취소</button>
                    <button className="btn btn-primary" onClick={saveEdit} disabled={busy !== null || !editing.title.trim()}>
                      {busy === `edit:${template.id}` ? <Loader2 size={14} className="spin" /> : <Save size={14} />} 저장
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: '#2D3748' }}>{template.title}</span>
                      {template.isPublished && (
                        <span style={{ fontSize: '0.75rem', background: '#F0FDF4', color: '#166534', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                          공개중
                        </span>
                      )}
                      {template.sourceType === 'copied' && (
                        <span style={{ fontSize: '0.75rem', background: '#EFF6FF', color: '#1D4ED8', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                          복사본
                        </span>
                      )}
                    </div>
                    {template.description && <p style={{ fontSize: '0.85rem', color: '#718096' }}>{template.description}</p>}
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.8rem', color: '#A0AEC0', flexWrap: 'wrap' }}>
                      {template.targetAudience && <span>{audienceLabel(template.targetAudience)}</span>}
                      {template.hskLevel && <span>{template.hskLevel}</span>}
                      <span>{new Date(template.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={() => startEdit(template)} disabled={busy !== null} style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
                      {busy === `load:${template.id}` ? <Loader2 size={14} className="spin" /> : <><Pencil size={14} /> 수정</>}
                    </button>
                    {!template.isPublished ? (
                      <button className="btn btn-secondary" onClick={() => publish(template.id)} disabled={busy !== null} style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
                        {busy === `publish:${template.id}` ? <Loader2 size={14} className="spin" /> : <><Globe size={14} /> 마켓 게시</>}
                      </button>
                    ) : (
                      <button className="btn btn-secondary" onClick={() => unpublish(template.id)} disabled={busy !== null} style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
                        {busy === `unpublish:${template.id}` ? <Loader2 size={14} className="spin" /> : <><GlobeOff size={14} /> 게시 취소</>}
                      </button>
                    )}
                    <button onClick={() => deleteTemplate(template.id)} disabled={busy !== null} style={{ padding: '0.4rem', background: 'transparent', border: 'none', color: '#E53E3E', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}>
                      {busy === `delete:${template.id}` ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
