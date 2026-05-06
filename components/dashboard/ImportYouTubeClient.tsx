'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp, Save, RotateCcw } from 'lucide-react';
import type {
  TargetAudience, HskLevel, OutputOptions, TranscriptPolicy,
  JobStatusResponse, ImportedYouTubeAIResult, SaveAs,
} from '@/lib/import-media/types';
import { JOB_STATUS_LABELS } from '@/lib/import-media/types';

// ─── Constants ─────────────────────────────────────────────────────────────────

const TARGET_AUDIENCE_OPTIONS: { value: TargetAudience; label: string }[] = [
  { value: 'middle_school', label: '중학생' },
  { value: 'high_school', label: '고등학생' },
  { value: 'university', label: '대학생' },
  { value: 'adult', label: '성인 일반' },
  { value: 'travel', label: '여행 중국어' },
  { value: 'business', label: '비즈니스 중국어' },
];

const HSK_LEVELS: HskLevel[] = ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'];

const SAVE_AS_OPTIONS: { value: SaveAs; label: string }[] = [
  { value: 'lesson_material', label: '수업 자료' },
  { value: 'lesson_plan_section', label: '수업 계획 섹션' },
  { value: 'template', label: '템플릿' },
  { value: 'generated_item', label: '생성 항목' },
];

const DEFAULT_OUTPUT_OPTIONS: OutputOptions = {
  includeSummary: true,
  includeVocabulary: true,
  includeExpressions: true,
  includeGrammarPoints: true,
  includeComprehensionQuestions: true,
  includeDiscussionQuestions: true,
  includeWritingPrompt: true,
  includeLessonActivities: true,
};

const DEFAULT_TRANSCRIPT_POLICY: TranscriptPolicy = {
  preferYouTubeCaption: true,
  allowAudioDownloadFallback: true,
  allowManualTranscriptFallback: false,
};

const OUTPUT_OPTION_LABELS: Record<keyof OutputOptions, string> = {
  includeSummary: '요약 (Summary)',
  includeVocabulary: '핵심 어휘',
  includeExpressions: '주요 표현',
  includeGrammarPoints: '문법 포인트',
  includeComprehensionQuestions: '이해 확인 질문',
  includeDiscussionQuestions: '토론 질문',
  includeWritingPrompt: '쓰기 과제',
  includeLessonActivities: '수업 활동',
};

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'transcript_unavailable']);

// ─── Step indicator ────────────────────────────────────────────────────────────

const STATUS_ORDER: JobStatusResponse['status'][] = [
  'queued', 'fetching_metadata', 'fetching_transcript',
  'downloading_audio', 'preprocessing_audio', 'transcribing_audio',
  'normalizing_transcript', 'generating_ai_result', 'validating_output', 'completed',
];

function ProgressSteps({ status }: { status: JobStatusResponse['status'] }) {
  const currentIdx = STATUS_ORDER.indexOf(status);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '1.5rem 0' }}>
      {STATUS_ORDER.filter(s => s !== 'queued').map((s, i) => {
        const idx = i + 1;
        const done = currentIdx > idx;
        const active = currentIdx === idx;
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: done ? 0.5 : 1 }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
              background: done ? 'var(--primary)' : active ? '#3B82F6' : '#E2E8F0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {done ? <CheckCircle size={14} color="white" /> : active ? <Loader2 size={12} color="white" style={{ animation: 'spin 1s linear infinite' }} /> : null}
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: active ? 700 : 400, color: active ? '#1A202C' : '#718096' }}>
              {JOB_STATUS_LABELS[s]}
            </span>
          </div>
        );
      })}
      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Result editor section ─────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1.25rem', background: '#F8FAFC', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.9rem', color: '#4A5568' }}
      >
        {title}
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && <div style={{ padding: '1rem 1.25rem' }}>{children}</div>}
    </div>
  );
}

function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#718096', marginBottom: '0.3rem' }}>{label}</label>
      <textarea
        className="input"
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={3}
        style={{ resize: 'vertical', fontSize: '0.9rem' }}
      />
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

type Step = 'form' | 'processing' | 'result' | 'saved';

export default function ImportYouTubeClient() {
  // Form state
  const [url, setUrl] = useState('');
  const [targetAudience, setTargetAudience] = useState<TargetAudience>('adult');
  const [hskLevel, setHskLevel] = useState<HskLevel | ''>('');
  const [outputOptions, setOutputOptions] = useState<OutputOptions>(DEFAULT_OUTPUT_OPTIONS);
  const [transcriptPolicy, setTranscriptPolicy] = useState<TranscriptPolicy>(DEFAULT_TRANSCRIPT_POLICY);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Job tracking
  const [step, setStep] = useState<Step>('form');
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Result editing
  const [editedResult, setEditedResult] = useState<ImportedYouTubeAIResult | null>(null);
  const [saveAs, setSaveAs] = useState<SaveAs>('lesson_material');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // ── Polling ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!jobId || step !== 'processing') return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/ai/import-media/jobs/${jobId}`);
        if (!res.ok) return;
        const data: JobStatusResponse = await res.json();
        setJobStatus(data);
        if (TERMINAL_STATUSES.has(data.status)) {
          clearInterval(pollRef.current!);
          if (data.status === 'completed' && data.aiResult) {
            setEditedResult(data.aiResult);
            setStep('result');
          }
        }
      } catch { /* network blip — keep polling */ }
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [jobId, step]);

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!url.trim()) { setFormError('YouTube URL을 입력하세요.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/ai/import-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: 'youtube',
          url: url.trim(),
          targetAudience,
          hskLevel: hskLevel || undefined,
          transcriptPolicy,
          outputOptions,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || '오류가 발생했습니다.'); return; }
      setJobId(data.importJobId);
      setJobStatus(null);
      setStep('processing');
    } catch { setFormError('서버와 통신하는 중 오류가 발생했습니다.'); }
    finally { setSubmitting(false); }
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!jobId || !editedResult) return;
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(`/api/ai/import-media/jobs/${jobId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saveAs, editedResult }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error || '저장에 실패했습니다.'); return; }
      setStep('saved');
    } catch { setSaveError('저장 중 네트워크 오류가 발생했습니다.'); }
    finally { setSaving(false); }
  };

  const updateResult = (fn: (prev: ImportedYouTubeAIResult) => ImportedYouTubeAIResult) => {
    setEditedResult(prev => prev ? fn(prev) : prev);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (step === 'saved') {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
        <CheckCircle size={64} color="#22C55E" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>저장 완료!</h2>
        <p style={{ color: '#718096', marginBottom: '2rem' }}>AI 교재가 성공적으로 저장되었습니다.</p>
        <button className="btn btn-primary" onClick={() => { setStep('form'); setJobId(null); setJobStatus(null); setEditedResult(null); setUrl(''); }}>
          <RotateCcw size={16} /> 새 영상 가져오기
        </button>
      </div>
    );
  }

  if (step === 'processing') {
    const st = jobStatus?.status;
    const failed = st === 'failed' || st === 'transcript_unavailable';
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>처리 중...</h1>
        <p style={{ color: '#718096', marginBottom: '1.5rem', fontSize: '0.9rem' }}>페이지를 닫지 마세요. 처리가 완료되면 자동으로 결과가 표시됩니다.</p>

        {jobStatus?.thumbnailUrl && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={jobStatus.thumbnailUrl} alt="썸네일" style={{ width: '120px', height: '68px', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
            <div>
              <p style={{ fontWeight: 700 }}>{jobStatus.videoTitle ?? '영상 정보 수집 중...'}</p>
              {jobStatus.channelName && <p style={{ fontSize: '0.85rem', color: '#718096' }}>{jobStatus.channelName}</p>}
            </div>
          </div>
        )}

        {!failed && st && <ProgressSteps status={st} />}

        {failed && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginTop: '1rem' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{st === 'transcript_unavailable' ? '자막을 찾을 수 없습니다' : '처리 실패'}</div>
            <div style={{ fontSize: '0.875rem' }}>{jobStatus?.error ?? '알 수 없는 오류가 발생했습니다.'}</div>
            <button className="btn btn-secondary" style={{ marginTop: '1rem', fontSize: '0.875rem' }} onClick={() => setStep('form')}>
              다시 시도
            </button>
          </div>
        )}

        {!st && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#718096' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <span>서버 응답을 기다리는 중...</span>
          </div>
        )}
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (step === 'result' && editedResult) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>AI 교재 초안</h1>
            <p style={{ color: '#718096', fontSize: '0.875rem', marginTop: '0.25rem' }}>내용을 검토하고 편집한 후 저장하세요.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              className="input"
              value={saveAs}
              onChange={e => setSaveAs(e.target.value as SaveAs)}
              style={{ fontSize: '0.875rem', width: 'auto' }}
            >
              {SAVE_AS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}로 저장</option>)}
            </select>
            {saveError && <span style={{ fontSize: '0.8rem', color: '#991B1B' }}>{saveError}</span>}
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> 저장 중...</> : <><Save size={16} /> 저장하기</>}
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#718096', marginBottom: '0.4rem' }}>수업 제목</label>
          <input className="input" value={editedResult.title} onChange={e => updateResult(r => ({ ...r, title: e.target.value }))} style={{ fontWeight: 700, fontSize: '1rem' }} />
        </div>

        {/* Summary */}
        <Section title="요약">
          <TextareaField label="간단 요약 (한국어)" value={editedResult.sourceSummary.shortSummaryKo}
            onChange={v => updateResult(r => ({ ...r, sourceSummary: { ...r.sourceSummary, shortSummaryKo: v } }))} />
          <TextareaField label="상세 요약 (한국어)" value={editedResult.sourceSummary.detailedSummaryKo}
            onChange={v => updateResult(r => ({ ...r, sourceSummary: { ...r.sourceSummary, detailedSummaryKo: v } }))} />
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#718096' }}>주요 주제</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
              {editedResult.sourceSummary.mainTopics.map((topic, i) => (
                <span key={i} style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.25rem 0.6rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 600 }}>{topic}</span>
              ))}
            </div>
          </div>
        </Section>

        {/* Vocabulary */}
        <Section title={`핵심 어휘 (${editedResult.chineseLearningContent.vocabulary.length}개)`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {editedResult.chineseLearningContent.vocabulary.map((v, i) => (
              <div key={i} style={{ background: '#F0FDF4', borderRadius: 'var(--radius-md)', padding: '0.75rem', borderLeft: '3px solid var(--primary)' }}>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#166534' }}>{v.word}</div>
                <div style={{ fontSize: '0.8rem', color: '#15803D' }}>{v.pinyin}</div>
                <div style={{ fontSize: '0.85rem', color: '#4A5568', marginTop: '0.25rem' }}>{v.meaning}</div>
                {v.exampleSentence && <div style={{ fontSize: '0.75rem', color: '#718096', marginTop: '0.2rem', fontStyle: 'italic' }}>{v.exampleSentence}</div>}
              </div>
            ))}
          </div>
        </Section>

        {/* Grammar Points */}
        {editedResult.chineseLearningContent.grammarPoints.length > 0 && (
          <Section title="문법 포인트">
            {editedResult.chineseLearningContent.grammarPoints.map((g, i) => (
              <div key={i} style={{ background: '#EFF6FF', borderRadius: 'var(--radius-md)', padding: '0.875rem', marginBottom: '0.75rem' }}>
                <div style={{ fontWeight: 700, color: '#1E40AF', marginBottom: '0.25rem' }}>{g.pattern}</div>
                <div style={{ fontSize: '0.875rem', color: '#1D4ED8', marginBottom: '0.4rem' }}>{g.explanation}</div>
                {g.examples.map((ex, j) => <div key={j} style={{ fontSize: '0.85rem', color: '#3730A3', marginLeft: '0.5rem' }}>• {ex}</div>)}
              </div>
            ))}
          </Section>
        )}

        {/* Key Expressions */}
        {editedResult.chineseLearningContent.keyExpressions.length > 0 && (
          <Section title="주요 표현" defaultOpen={false}>
            {editedResult.chineseLearningContent.keyExpressions.map((expr, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', padding: '0.6rem 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ fontWeight: 700, color: '#1A202C', minWidth: '120px' }}>{expr.expression}</span>
                <span style={{ color: '#718096', fontSize: '0.875rem' }}>{expr.meaning}</span>
              </div>
            ))}
          </Section>
        )}

        {/* Comprehension Questions */}
        {editedResult.classroomMaterials.comprehensionQuestions.length > 0 && (
          <Section title={`이해 확인 질문 (${editedResult.classroomMaterials.comprehensionQuestions.length}개)`} defaultOpen={false}>
            {editedResult.classroomMaterials.comprehensionQuestions.map((q, i) => (
              <div key={i} style={{ background: '#F8FAFC', borderRadius: 'var(--radius-md)', padding: '0.875rem', marginBottom: '0.6rem' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>Q{i + 1}. {q.question}</div>
                <div style={{ fontSize: '0.875rem', color: '#22C55E' }}>A: {q.answer}</div>
              </div>
            ))}
          </Section>
        )}

        {/* Discussion Questions */}
        {editedResult.classroomMaterials.discussionQuestions.length > 0 && (
          <Section title="토론 질문" defaultOpen={false}>
            {editedResult.classroomMaterials.discussionQuestions.map((q, i) => (
              <div key={i} style={{ padding: '0.5rem 0', borderBottom: '1px solid #F1F5F9', fontSize: '0.9rem' }}>
                {i + 1}. {q.question}
              </div>
            ))}
          </Section>
        )}

        {/* Writing Prompts */}
        {editedResult.classroomMaterials.writingPrompts.length > 0 && (
          <Section title="쓰기 과제" defaultOpen={false}>
            {editedResult.classroomMaterials.writingPrompts.map((wp, i) => (
              <div key={i} style={{ background: '#FFF7ED', borderRadius: 'var(--radius-md)', padding: '0.875rem', marginBottom: '0.6rem' }}>
                <div style={{ fontWeight: 600 }}>{wp.prompt}</div>
                {wp.wordCount && <div style={{ fontSize: '0.8rem', color: '#9A3412', marginTop: '0.25rem' }}>목표 단어수: {wp.wordCount}자</div>}
              </div>
            ))}
          </Section>
        )}

        {/* Activities */}
        {editedResult.classroomMaterials.activities.length > 0 && (
          <Section title="수업 활동" defaultOpen={false}>
            {editedResult.classroomMaterials.activities.map((act, i) => (
              <div key={i} style={{ padding: '0.75rem 0', borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ fontWeight: 700 }}>{act.title} {act.durationMinutes ? `(${act.durationMinutes}분)` : ''}</div>
                <div style={{ fontSize: '0.875rem', color: '#718096', marginTop: '0.25rem' }}>{act.description}</div>
              </div>
            ))}
          </Section>
        )}

        {/* Teacher Notes */}
        <Section title="교사 노트" defaultOpen={false}>
          <TextareaField label="주의 사항" value={editedResult.teacherNotes.cautionNotesKo}
            onChange={v => updateResult(r => ({ ...r, teacherNotes: { ...r.teacherNotes, cautionNotesKo: v } }))} />
          <TextareaField label="수업 활용 제안" value={editedResult.teacherNotes.suggestedUsageKo}
            onChange={v => updateResult(r => ({ ...r, teacherNotes: { ...r.teacherNotes, suggestedUsageKo: v } }))} />
        </Section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          {saveError && <span style={{ fontSize: '0.875rem', color: '#991B1B', alignSelf: 'center' }}>{saveError}</span>}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ fontSize: '1rem', padding: '0.875rem 2rem' }}>
            {saving ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> 저장 중...</> : <><Save size={18} /> 저장하기</>}
          </button>
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '740px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>YouTube AI 교재 제작</h1>
        <p style={{ color: '#718096', marginTop: '0.4rem' }}>
          유튜브 영상 URL을 입력하면 자막 또는 음성 인식을 통해 중국어 교재를 자동 생성합니다.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* URL */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: '#4A5568' }}>YouTube URL *</label>
          <input
            type="text"
            className="input"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={e => setUrl(e.target.value)}
            required
            style={{ fontSize: '0.95rem' }}
          />
        </div>

        {/* Audience + Level */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: '#4A5568' }}>학습 대상 *</label>
            <select className="input" value={targetAudience} onChange={e => setTargetAudience(e.target.value as TargetAudience)}>
              {TARGET_AUDIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: '#4A5568' }}>HSK 수준 (선택)</label>
            <select className="input" value={hskLevel} onChange={e => setHskLevel(e.target.value as HskLevel | '')}>
              <option value="">자동 감지</option>
              {HSK_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        {/* Output options */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontWeight: 700, marginBottom: '1rem', color: '#4A5568' }}>포함할 콘텐츠</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
            {(Object.keys(outputOptions) as (keyof OutputOptions)[]).map(key => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input
                  type="checkbox"
                  checked={outputOptions[key]}
                  onChange={e => setOutputOptions(prev => ({ ...prev, [key]: e.target.checked }))}
                />
                {OUTPUT_OPTION_LABELS[key]}
              </label>
            ))}
          </div>
        </div>

        {/* Transcript policy */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 700, marginBottom: '1rem', color: '#4A5568' }}>스크립트 옵션</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={transcriptPolicy.preferYouTubeCaption}
                onChange={e => setTranscriptPolicy(p => ({ ...p, preferYouTubeCaption: e.target.checked }))} />
              유튜브 자막 우선 사용 (자막이 있으면 오디오 다운로드 생략)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={transcriptPolicy.allowAudioDownloadFallback}
                onChange={e => setTranscriptPolicy(p => ({ ...p, allowAudioDownloadFallback: e.target.checked }))} />
              자막이 없을 때 오디오 다운로드 후 음성 인식(STT) 사용
            </label>
          </div>
          {transcriptPolicy.allowAudioDownloadFallback && (
            <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#9A3412', background: '#FFF7ED', padding: '0.6rem 0.875rem', borderRadius: 'var(--radius-md)' }}>
              ⚠ 오디오 다운로드는 서버에 임시 저장되며, 음성 인식 완료 후 즉시 삭제됩니다. yt-dlp와 ffmpeg가 서버에 설치되어 있어야 합니다.
            </p>
          )}
        </div>

        {formError && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {formError}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%', padding: '0.875rem', fontSize: '1rem' }}>
          {submitting
            ? <><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> 작업 생성 중...</>
            : '교재 생성 시작'}
        </button>
      </form>
      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
