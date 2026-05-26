'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, Paperclip, Upload } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface CourseOption {
  id: string;
  title: string;
  lessons: Array<{ id: string; title: string }>;
}

interface UploadedFileOption {
  id: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  conversionStatus: string;
  description: string | null;
  createdAt: string;
}

export default function AssignmentFormClient({ courses, files: initialFiles }: { courses: CourseOption[]; files: UploadedFileOption[] }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [files, setFiles] = useState(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(courses[0]?.id || '');
  const [generateRubric, setGenerateRubric] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    lessonId: '',
    type: 'writing',
    prompt: '',
    dueDate: '',
    hskLevel: 'HSK3',
    targetAudience: '중국어 학습자',
    attachmentIds: [] as string[],
  });

  const activeCourse = courses.find(c => c.id === selectedCourse);
  const lessons = activeCourse?.lessons || [];

  const toggleAttachment = (fileId: string) => {
    setFormData((prev) => ({
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
    setSubmitError('');
    try {
      const payload = new FormData();
      payload.append('file', file);
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: payload,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSubmitError(data.error || '파일 업로드에 실패했습니다.');
        return;
      }
      const uploaded = {
        ...data.file,
        createdAt: new Date(data.file.createdAt).toISOString(),
      } as UploadedFileOption;
      setFiles((prev) => [uploaded, ...prev.filter((item) => item.id !== uploaded.id)]);
      setFormData((prev) => ({ ...prev, attachmentIds: [...prev.attachmentIds, uploaded.id] }));
    } catch {
      setSubmitError('파일 업로드 중 네트워크 오류가 발생했습니다.');
    } finally {
      event.target.value = '';
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lessonId || !formData.title || !formData.prompt) return;

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const assignment = await response.json();
        if (formData.type === 'writing' && generateRubric) {
          const rubricRes = await fetch('/api/ai/writing-rubrics/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              assignmentId: assignment.id,
              hskLevel: formData.hskLevel,
              targetAudience: formData.targetAudience,
            }),
          });
          if (!rubricRes.ok) {
            const data = await rubricRes.json().catch(() => ({}));
            setSubmitError(data.error || t.assignmentForm.rubricError);
            return;
          }
        }
        router.push('/assignments');
        router.refresh();
      } else {
        const data = await response.json().catch(() => ({}));
        setSubmitError(data.error || t.assignmentForm.createError);
      }
    } catch {
      setSubmitError(t.assignmentForm.networkError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#4A5568' }}>{t.assignmentForm.labelCourse}</label>
          <select
            className="input"
            value={selectedCourse}
            onChange={(e) => {
              setSelectedCourse(e.target.value);
              setFormData({ ...formData, lessonId: '' });
            }}
            required
          >
            <option value="" disabled>{t.assignmentForm.selectCourse}</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#4A5568' }}>{t.assignmentForm.labelLesson}</label>
          <select
            className="input"
            value={formData.lessonId}
            onChange={(e) => setFormData({ ...formData, lessonId: e.target.value })}
            required
            disabled={!selectedCourse}
          >
            <option value="" disabled>{t.assignmentForm.selectLesson}</option>
            {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#4A5568' }}>{t.assignmentForm.labelTitle}</label>
        <input
          type="text"
          className="input"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder={t.assignmentForm.titlePlaceholder}
          required
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#4A5568' }}>{t.assignmentForm.labelType}</label>
          <select
            className="input"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            required
          >
            <option value="writing">{t.assignmentForm.typeWriting}</option>
            <option value="speaking">{t.assignmentForm.typeSpeaking}</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#4A5568' }}>{t.assignmentForm.labelDueDate}</label>
          <input
            type="date"
            className="input"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          />
        </div>
      </div>

      {formData.type === 'writing' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#4A5568' }}>{t.assignmentForm.labelHskLevel}</label>
            <select
              className="input"
              value={formData.hskLevel}
              onChange={(e) => setFormData({ ...formData, hskLevel: e.target.value })}
            >
              {['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'].map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#4A5568' }}>{t.assignmentForm.labelAudience}</label>
            <input
              type="text"
              className="input"
              value={formData.targetAudience}
              onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
              placeholder={t.assignmentForm.audiencePlaceholder}
            />
          </div>
          <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4A5568', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={generateRubric}
              onChange={(e) => setGenerateRubric(e.target.checked)}
            />
            {t.assignmentForm.autoRubric}
          </label>
        </div>
      )}

      <div style={{ marginBottom: '2.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#4A5568' }}>{t.assignmentForm.labelPrompt}</label>
        <textarea
          className="input"
          value={formData.prompt}
          onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
          placeholder={t.assignmentForm.promptPlaceholder}
          style={{ minHeight: '150px', resize: 'vertical' }}
          required
        />
      </div>

      <div style={{ border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: '#4A5568' }}>
            <Paperclip size={17} color="var(--primary)" /> 첨부파일
          </div>
          <label className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.82rem', cursor: uploading || isSubmitting ? 'not-allowed' : 'pointer' }}>
            {uploading ? <Loader2 size={15} className="spin" /> : <Upload size={15} />} 새 파일 업로드
            <input type="file" accept=".pdf,.hwp,.hwpx" onChange={handleUpload} disabled={uploading || isSubmitting} style={{ display: 'none' }} />
          </label>
        </div>

        {files.length === 0 ? (
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
                  border: formData.attachmentIds.includes(file.id) ? '1px solid var(--primary)' : '1px solid #E2E8F0',
                  background: formData.attachmentIds.includes(file.id) ? 'var(--primary-light)' : '#F8FAFC',
                  cursor: 'pointer',
                }}
              >
                <input type="checkbox" checked={formData.attachmentIds.includes(file.id)} onChange={() => toggleAttachment(file.id)} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 700, color: '#2D3748', fontSize: '0.86rem', overflowWrap: 'anywhere' }}>{file.originalName}</span>
                  <span style={{ color: '#718096', fontSize: '0.76rem' }}>{file.fileType.toUpperCase()} · {Math.round(file.fileSize / 1024)} KB · {file.conversionStatus}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {submitError && (
        <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {submitError}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        <button type="button" onClick={() => router.back()} className="btn btn-secondary">
          {t.assignmentForm.cancel}
        </button>
        <button type="submit" disabled={isSubmitting || !formData.lessonId || !formData.title || !formData.prompt} className="btn btn-primary">
          {isSubmitting
            ? <><Loader2 size={18} className="spin" style={{ marginRight: '0.5rem' }} /> {t.assignmentForm.submitting}</>
            : <><Save size={18} style={{ marginRight: '0.5rem' }} /> {t.assignmentForm.submit}</>}
        </button>
      </div>
    </form>
  );
}
