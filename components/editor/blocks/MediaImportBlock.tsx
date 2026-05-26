'use client';

import { useEffect, useRef, useState } from 'react';
import { useEditor } from '@/context/EditorContext';
import { parseYouTubeUrl } from '@/lib/youtube-url';
import { JOB_STATUS_LABELS } from '@/lib/import-media/types';
import type {
  ComprehensionQuestion,
  DialogueLine,
  GrammarPoint,
  HskLevel,
  ImportedYouTubeAIResult,
  JobStatusResponse,
  OutputOptions,
  TargetAudience,
  TranscriptPolicy,
  VocabularyItem,
} from '@/lib/import-media/types';
import { CheckCircle, ChevronDown, ChevronUp, Loader2, Plus, RotateCcw, Save, Trash2, Video } from 'lucide-react';

interface MediaImportContent {
  url?: string;
  importJobId?: string;
  title?: string;
  transcript?: string;
  targetAudience?: TargetAudience;
  hskLevel?: HskLevel | '';
  outputOptions?: OutputOptions;
  aiResult?: ImportedYouTubeAIResult;
  savedContentId?: string;
}

const TARGET_AUDIENCES: { value: TargetAudience; label: string }[] = [
  { value: 'middle_school', label: '중학생' },
  { value: 'high_school', label: '고등학생' },
  { value: 'university', label: '대학생' },
  { value: 'adult', label: '성인 일반' },
  { value: 'travel', label: '여행 중국어' },
  { value: 'business', label: '비즈니스 중국어' },
];

const HSK_LEVELS: HskLevel[] = ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'];

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

const OUTPUT_OPTION_ITEMS: Array<{ key: keyof OutputOptions; label: string }> = [
  { key: 'includeSummary', label: '요약' },
  { key: 'includeVocabulary', label: '핵심 어휘' },
  { key: 'includeExpressions', label: '표현' },
  { key: 'includeGrammarPoints', label: '문법 포인트' },
  { key: 'includeComprehensionQuestions', label: '이해 확인 질문' },
  { key: 'includeDiscussionQuestions', label: '토론 질문' },
  { key: 'includeWritingPrompt', label: '작문 프롬프트' },
  { key: 'includeLessonActivities', label: '수업 활동' },
];

const DEFAULT_TRANSCRIPT_POLICY: TranscriptPolicy = {
  preferYouTubeCaption: true,
  allowAudioDownloadFallback: true,
  allowManualTranscriptFallback: false,
};

const TERMINAL_STATUSES = new Set<JobStatusResponse['status']>(['completed', 'failed', 'transcript_unavailable']);

const fieldLabelStyle: React.CSSProperties = {
  color: '#4A5568',
  fontSize: '0.76rem',
  fontWeight: 800,
};

function applyOutputOptions(result: ImportedYouTubeAIResult, options: OutputOptions): ImportedYouTubeAIResult {
  return {
    ...result,
    sourceSummary: options.includeSummary
      ? result.sourceSummary
      : { shortSummaryKo: '', detailedSummaryKo: '', mainTopics: [] },
    // dialogScript is always preserved — it is mandatory
    chineseLearningContent: {
      ...result.chineseLearningContent,
      vocabulary: options.includeVocabulary ? result.chineseLearningContent.vocabulary : [],
      keyExpressions: options.includeExpressions ? result.chineseLearningContent.keyExpressions : [],
      grammarPoints: options.includeGrammarPoints ? result.chineseLearningContent.grammarPoints : [],
    },
    classroomMaterials: {
      ...result.classroomMaterials,
      comprehensionQuestions: options.includeComprehensionQuestions ? result.classroomMaterials.comprehensionQuestions : [],
      discussionQuestions: options.includeDiscussionQuestions ? result.classroomMaterials.discussionQuestions : [],
      writingPrompts: options.includeWritingPrompt ? result.classroomMaterials.writingPrompts : [],
      activities: options.includeLessonActivities ? result.classroomMaterials.activities : [],
    },
  };
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{ width: '100%', padding: '0.85rem 1rem', border: 'none', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, color: '#4A5568', cursor: 'pointer' }}
      >
        {title}
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && <div style={{ padding: '1rem' }}>{children}</div>}
    </div>
  );
}

export default function MediaImportBlock({ id, content }: { id: string; content: MediaImportContent }) {
  const { updateBlock, lessonId, courseId } = useEditor();
  const [url, setUrl] = useState(content.url || '');
  const [targetAudience, setTargetAudience] = useState<TargetAudience>(content.targetAudience || 'adult');
  const [hskLevel, setHskLevel] = useState<HskLevel | ''>(content.hskLevel || '');
  const [outputOptions, setOutputOptions] = useState<OutputOptions>(content.outputOptions || DEFAULT_OUTPUT_OPTIONS);
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState(content.importJobId || '');
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null);
  const [editedResult, setEditedResult] = useState<ImportedYouTubeAIResult | null>(content.aiResult || null);
  const [transcript, setTranscript] = useState(content.transcript || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [savingRecord, setSavingRecord] = useState(false);
  const [savedContentId, setSavedContentId] = useState(content.savedContentId || '');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isProcessing = Boolean(jobId && !editedResult && !errorMsg);
  const hasSelectedOutput = Object.values(outputOptions).some(Boolean);

  const updateOutputOption = (key: keyof OutputOptions, checked: boolean) => {
    const next = { ...outputOptions, [key]: checked };
    setOutputOptions(next);
    updateBlock(id, { outputOptions: next });
  };

  useEffect(() => {
    if (!jobId || editedResult || errorMsg) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/ai/import-media/jobs/${jobId}`);
        const data: JobStatusResponse = await res.json();
        if (!res.ok) return;
        setJobStatus(data);

        if (TERMINAL_STATUSES.has(data.status)) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          if (data.status === 'completed' && data.aiResult) {
            const nextAiResult = applyOutputOptions(data.aiResult, outputOptions);
            setEditedResult(nextAiResult);
            setTranscript(data.transcriptText || '');
            updateBlock(id, {
              url: data.sourceUrl,
              importJobId: data.importJobId,
              title: data.videoTitle || nextAiResult.title,
              transcript: data.transcriptText || '',
              targetAudience,
              hskLevel,
              outputOptions,
              aiResult: nextAiResult,
            });
          } else {
            setErrorMsg(data.error || '미디어 추출 작업이 완료되지 못했습니다.');
          }
        }
      } catch {
        // Keep polling through transient network errors.
      }
    };

    void poll();
    pollRef.current = setInterval(poll, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobId, editedResult, errorMsg, hskLevel, id, outputOptions, targetAudience, updateBlock]);

  const startImport = async () => {
    setErrorMsg('');
    setSavedContentId('');
    if (!parseYouTubeUrl(url.trim())) {
      setErrorMsg('유효한 YouTube URL이 아닙니다. 일반 링크, Shorts, youtu.be 링크를 지원합니다.');
      return;
    }
    if (!hasSelectedOutput) {
      setErrorMsg('최소 하나 이상의 출력 섹션을 선택해 주세요.');
      return;
    }

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
          transcriptPolicy: DEFAULT_TRANSCRIPT_POLICY,
          outputOptions,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.message || data.error || '미디어 추출 작업 생성에 실패했습니다.');
        return;
      }
      setEditedResult(null);
      setTranscript('');
      setJobStatus(null);
      setJobId(data.importJobId);
      updateBlock(id, {
        url: url.trim(),
        importJobId: data.importJobId,
        targetAudience,
        hskLevel,
        outputOptions,
        aiResult: undefined,
        transcript: undefined,
        savedContentId: undefined,
      });
    } catch {
      setErrorMsg('서버와 통신하는 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateResult = (next: ImportedYouTubeAIResult) => {
    setEditedResult(next);
    setSavedContentId('');
    updateBlock(id, { aiResult: next, title: next.title, transcript, savedContentId: undefined });
  };

  const updateVocabularyItem = (index: number, patch: Partial<VocabularyItem>) => {
    if (!editedResult) return;
    const vocabulary = [...editedResult.chineseLearningContent.vocabulary];
    vocabulary[index] = { ...vocabulary[index], ...patch };
    updateResult({
      ...editedResult,
      chineseLearningContent: {
        ...editedResult.chineseLearningContent,
        vocabulary,
      },
    });
  };

  const addVocabularyItem = () => {
    if (!editedResult) return;
    updateResult({
      ...editedResult,
      chineseLearningContent: {
        ...editedResult.chineseLearningContent,
        vocabulary: [
          ...editedResult.chineseLearningContent.vocabulary,
          { word: '', pinyin: '', meaning: '', exampleSentence: '', hskLevel: hskLevel || undefined },
        ],
      },
    });
  };

  const removeVocabularyItem = (index: number) => {
    if (!editedResult) return;
    updateResult({
      ...editedResult,
      chineseLearningContent: {
        ...editedResult.chineseLearningContent,
        vocabulary: editedResult.chineseLearningContent.vocabulary.filter((_, itemIndex) => itemIndex !== index),
      },
    });
  };

  const updateGrammarPoint = (index: number, patch: Partial<GrammarPoint>) => {
    if (!editedResult) return;
    const grammarPoints = [...editedResult.chineseLearningContent.grammarPoints];
    grammarPoints[index] = { ...grammarPoints[index], ...patch };
    updateResult({
      ...editedResult,
      chineseLearningContent: {
        ...editedResult.chineseLearningContent,
        grammarPoints,
      },
    });
  };

  const addGrammarPoint = () => {
    if (!editedResult) return;
    updateResult({
      ...editedResult,
      chineseLearningContent: {
        ...editedResult.chineseLearningContent,
        grammarPoints: [
          ...editedResult.chineseLearningContent.grammarPoints,
          { pattern: '', explanation: '', examples: [] },
        ],
      },
    });
  };

  const removeGrammarPoint = (index: number) => {
    if (!editedResult) return;
    updateResult({
      ...editedResult,
      chineseLearningContent: {
        ...editedResult.chineseLearningContent,
        grammarPoints: editedResult.chineseLearningContent.grammarPoints.filter((_, itemIndex) => itemIndex !== index),
      },
    });
  };

  const updateDialogueLine = (index: number, patch: Partial<DialogueLine>) => {
    if (!editedResult) return;
    const lines = [...(editedResult.dialogScript?.lines ?? [])];
    lines[index] = { ...lines[index], ...patch };
    updateResult({ ...editedResult, dialogScript: { ...editedResult.dialogScript, lines } });
  };

  const addDialogueLine = () => {
    if (!editedResult) return;
    const lines = [...(editedResult.dialogScript?.lines ?? []), { speaker: '', chinese: '', pinyin: '', korean: '' }];
    updateResult({ ...editedResult, dialogScript: { ...editedResult.dialogScript, lines } });
  };

  const removeDialogueLine = (index: number) => {
    if (!editedResult) return;
    const lines = (editedResult.dialogScript?.lines ?? []).filter((_, i) => i !== index);
    updateResult({ ...editedResult, dialogScript: { ...editedResult.dialogScript, lines } });
  };

  const updateComprehensionQuestion = (index: number, patch: Partial<ComprehensionQuestion>) => {
    if (!editedResult) return;
    const comprehensionQuestions = [...editedResult.classroomMaterials.comprehensionQuestions];
    comprehensionQuestions[index] = { ...comprehensionQuestions[index], ...patch };
    updateResult({
      ...editedResult,
      classroomMaterials: {
        ...editedResult.classroomMaterials,
        comprehensionQuestions,
      },
    });
  };

  const addComprehensionQuestion = () => {
    if (!editedResult) return;
    updateResult({
      ...editedResult,
      classroomMaterials: {
        ...editedResult.classroomMaterials,
        comprehensionQuestions: [
          ...editedResult.classroomMaterials.comprehensionQuestions,
          { question: '', answer: '', difficulty: 'medium' },
        ],
      },
    });
  };

  const removeComprehensionQuestion = (index: number) => {
    if (!editedResult) return;
    updateResult({
      ...editedResult,
      classroomMaterials: {
        ...editedResult.classroomMaterials,
        comprehensionQuestions: editedResult.classroomMaterials.comprehensionQuestions.filter((_, itemIndex) => itemIndex !== index),
      },
    });
  };

  const saveImportedRecord = async () => {
    if (!jobId || !editedResult) return;
    setSavingRecord(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/ai/import-media/jobs/${jobId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saveAs: 'lesson_material',
          courseId,
          lessonId,
          editedResult: applyOutputOptions(editedResult, outputOptions),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || '가져오기 기록 저장에 실패했습니다.');
        return;
      }
      setSavedContentId(data.savedContentId);
      updateBlock(id, { savedContentId: data.savedContentId });
    } catch {
      setErrorMsg('가져오기 기록 저장 중 네트워크 오류가 발생했습니다.');
    } finally {
      setSavingRecord(false);
    }
  };

  const resetBlock = () => {
    setJobId('');
    setJobStatus(null);
    setEditedResult(null);
    setTranscript('');
    setErrorMsg('');
    setSavedContentId('');
    setOutputOptions(DEFAULT_OUTPUT_OPTIONS);
    updateBlock(id, {
      url: '',
      importJobId: undefined,
      title: undefined,
      transcript: undefined,
      aiResult: undefined,
      savedContentId: undefined,
      outputOptions: DEFAULT_OUTPUT_OPTIONS,
    });
  };

  if (!editedResult) {
    return (
      <div style={{ width: '100%', margin: '1rem 0' }}>
        <div style={{ background: 'var(--primary-light)', border: '2px solid var(--primary)', borderRadius: 'var(--radius-lg)', padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--primary)' }}>
            <Video size={24} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>유튜브 미디어 추출</h3>
          </div>
          <p style={{ color: '#4A5568', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            editor 안에서 YouTube 영상을 AI 교재 초안으로 변환합니다. 자막이 없으면 yt-dlp, ffmpeg, STT 설정이 필요합니다.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 140px', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=... 또는 https://youtu.be/... 또는 /shorts/..." />
            <select className="input" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value as TargetAudience)}>
              {TARGET_AUDIENCES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select className="input" value={hskLevel} onChange={(e) => setHskLevel(e.target.value as HskLevel | '')}>
              <option value="">HSK 자동</option>
              {HSK_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
            </select>
          </div>

          <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '0.9rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4A5568', marginBottom: '0.65rem' }}>출력 섹션</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
              {OUTPUT_OPTION_ITEMS.map((option) => (
                <label key={option.key} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#4A5568', fontSize: '0.84rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={outputOptions[option.key]}
                    onChange={(event) => updateOutputOption(option.key, event.target.checked)}
                    disabled={submitting || isProcessing}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          {isProcessing && (
            <div style={{ background: 'white', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', margin: '1rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--primary)', fontWeight: 800, marginBottom: '0.75rem' }}>
                <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />
                {jobStatus ? JOB_STATUS_LABELS[jobStatus.status] : '작업 대기 중...'}
              </div>
              {jobStatus?.videoTitle && <div style={{ color: '#4A5568', fontSize: '0.9rem', fontWeight: 700 }}>{jobStatus.videoTitle}</div>}
              {jobStatus?.channelName && <div style={{ color: '#718096', fontSize: '0.82rem' }}>{jobStatus.channelName}</div>}
            </div>
          )}

          {errorMsg && (
            <div style={{ padding: '0.75rem', background: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            {(jobId || errorMsg) && (
              <button type="button" className="btn btn-secondary" onClick={resetBlock}>
                <RotateCcw size={16} /> 초기화
              </button>
            )}
            <button type="button" onClick={startImport} disabled={submitting || isProcessing || !url.trim() || !hasSelectedOutput} className="btn btn-primary">
              {submitting ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> 작업 생성 중...</> : '교재 생성 시작'}
            </button>
          </div>
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-lg)', padding: '1.5rem', margin: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <div style={{ color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 800, marginBottom: '0.25rem' }}>YouTube AI 교재 초안</div>
          <input
            className="input"
            value={editedResult.title}
            onChange={(e) => updateResult({ ...editedResult, title: e.target.value })}
            style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2D3748' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={saveImportedRecord} disabled={savingRecord}>
            {savingRecord ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> 저장 중...</> : <><Save size={16} /> 가져오기 기록 저장</>}
          </button>
          <button type="button" className="btn btn-secondary" onClick={resetBlock}>
            <RotateCcw size={16} /> 다시 가져오기
          </button>
        </div>
      </div>

      {savedContentId && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#166534', background: '#F0FDF4', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.75rem', marginBottom: '1rem', fontSize: '0.84rem', fontWeight: 700 }}>
          <CheckCircle size={16} /> 가져오기 기록이 저장되었습니다. lesson draft는 상단 임시 저장 버튼으로 저장하세요.
        </div>
      )}
      {errorMsg && (
        <div style={{ padding: '0.75rem', background: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {transcript && (
          <Section title="원문 Transcript" defaultOpen={false}>
            <textarea
              className="input"
              value={transcript}
              onChange={(e) => {
                setTranscript(e.target.value);
                setSavedContentId('');
                updateBlock(id, { transcript: e.target.value, savedContentId: undefined });
              }}
              style={{ minHeight: 160, resize: 'vertical', lineHeight: 1.7 }}
            />
          </Section>
        )}

        {outputOptions.includeSummary && (
          <Section title="요약">
            <textarea
              className="input"
              value={editedResult.sourceSummary.detailedSummaryKo}
              onChange={(e) => updateResult({ ...editedResult, sourceSummary: { ...editedResult.sourceSummary, detailedSummaryKo: e.target.value } })}
              style={{ minHeight: 120, resize: 'vertical', lineHeight: 1.7 }}
            />
          </Section>
        )}

        {editedResult.dialogScript && editedResult.dialogScript.lines.length > 0 && (
          <Section title={`대화 스크립트 (${editedResult.dialogScript.lines.length}줄)`}>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {editedResult.dialogScript.lines.map((line, index) => (
                <div key={index} style={{ background: '#FFFBEB', borderLeft: '3px solid #F59E0B', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.55rem', alignItems: 'end', marginBottom: '0.55rem' }}>
                    <label style={fieldLabelStyle}>
                      화자
                      <input className="input" value={line.speaker ?? ''} onChange={(e) => updateDialogueLine(index, { speaker: e.target.value })} style={{ marginTop: '0.25rem' }} placeholder="예: A, 주인공" />
                    </label>
                    <label style={fieldLabelStyle}>
                      병음
                      <input className="input" value={line.pinyin ?? ''} onChange={(e) => updateDialogueLine(index, { pinyin: e.target.value })} style={{ marginTop: '0.25rem' }} />
                    </label>
                    <button type="button" onClick={() => removeDialogueLine(index)} className="btn btn-secondary" style={{ padding: '0.55rem', color: '#B91C1C' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <label style={fieldLabelStyle}>
                    중국어
                    <input className="input" value={line.chinese} onChange={(e) => updateDialogueLine(index, { chinese: e.target.value })} style={{ marginTop: '0.25rem', fontWeight: 600 }} />
                  </label>
                  <label style={{ ...fieldLabelStyle, display: 'block', marginTop: '0.55rem' }}>
                    한국어 번역
                    <input className="input" value={line.korean} onChange={(e) => updateDialogueLine(index, { korean: e.target.value })} style={{ marginTop: '0.25rem' }} />
                  </label>
                </div>
              ))}
              {editedResult.dialogScript.notesKo && (
                <label style={fieldLabelStyle}>
                  장면 메모
                  <textarea className="input" value={editedResult.dialogScript.notesKo} onChange={(e) => updateResult({ ...editedResult, dialogScript: { ...editedResult.dialogScript!, notesKo: e.target.value } })} style={{ marginTop: '0.25rem', minHeight: 60, resize: 'vertical' }} />
                </label>
              )}
              <button type="button" onClick={addDialogueLine} className="btn btn-secondary" style={{ justifySelf: 'start', fontSize: '0.85rem' }}>
                <Plus size={15} /> 대사 추가
              </button>
            </div>
          </Section>
        )}

        {outputOptions.includeVocabulary && (
          <Section title={`핵심 어휘 (${editedResult.chineseLearningContent.vocabulary.length}개)`}>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {editedResult.chineseLearningContent.vocabulary.map((item, index) => (
                <div key={index} style={{ background: '#F0FDF4', borderLeft: '3px solid var(--primary)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.55rem', alignItems: 'end', marginBottom: '0.55rem' }}>
                    <label style={fieldLabelStyle}>
                      단어
                      <input className="input" value={item.word} onChange={(e) => updateVocabularyItem(index, { word: e.target.value })} style={{ marginTop: '0.25rem' }} />
                    </label>
                    <label style={fieldLabelStyle}>
                      병음
                      <input className="input" value={item.pinyin} onChange={(e) => updateVocabularyItem(index, { pinyin: e.target.value })} style={{ marginTop: '0.25rem' }} />
                    </label>
                    <button type="button" onClick={() => removeVocabularyItem(index)} className="btn btn-secondary" style={{ padding: '0.55rem', color: '#B91C1C' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <label style={fieldLabelStyle}>
                    뜻
                    <input className="input" value={item.meaning} onChange={(e) => updateVocabularyItem(index, { meaning: e.target.value })} style={{ marginTop: '0.25rem' }} />
                  </label>
                  <label style={{ ...fieldLabelStyle, display: 'block', marginTop: '0.55rem' }}>
                    예문
                    <input className="input" value={item.exampleSentence || ''} onChange={(e) => updateVocabularyItem(index, { exampleSentence: e.target.value })} style={{ marginTop: '0.25rem' }} />
                  </label>
                </div>
              ))}
              <button type="button" onClick={addVocabularyItem} className="btn btn-secondary" style={{ justifySelf: 'start', fontSize: '0.85rem' }}>
                <Plus size={15} /> 어휘 추가
              </button>
            </div>
          </Section>
        )}

        {outputOptions.includeGrammarPoints && (
          <Section title="문법 포인트" defaultOpen={false}>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {editedResult.chineseLearningContent.grammarPoints.map((item, index) => (
                <div key={index} style={{ background: '#EFF6FF', borderLeft: '3px solid #3B82F6', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.55rem', alignItems: 'end', marginBottom: '0.55rem' }}>
                    <label style={fieldLabelStyle}>
                      문법 패턴
                      <input className="input" value={item.pattern} onChange={(e) => updateGrammarPoint(index, { pattern: e.target.value })} style={{ marginTop: '0.25rem' }} />
                    </label>
                    <button type="button" onClick={() => removeGrammarPoint(index)} className="btn btn-secondary" style={{ padding: '0.55rem', color: '#B91C1C' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <label style={fieldLabelStyle}>
                    설명
                    <textarea className="input" value={item.explanation} onChange={(e) => updateGrammarPoint(index, { explanation: e.target.value })} style={{ marginTop: '0.25rem', minHeight: 80, resize: 'vertical' }} />
                  </label>
                  <label style={{ ...fieldLabelStyle, display: 'block', marginTop: '0.55rem' }}>
                    예문 (줄바꿈으로 구분)
                    <textarea
                      className="input"
                      value={(item.examples || []).join('\n')}
                      onChange={(e) => updateGrammarPoint(index, { examples: e.target.value.split('\n').map((line) => line.trim()).filter(Boolean) })}
                      style={{ marginTop: '0.25rem', minHeight: 80, resize: 'vertical' }}
                    />
                  </label>
                </div>
              ))}
              <button type="button" onClick={addGrammarPoint} className="btn btn-secondary" style={{ justifySelf: 'start', fontSize: '0.85rem' }}>
                <Plus size={15} /> 문법 추가
              </button>
            </div>
          </Section>
        )}

        {outputOptions.includeComprehensionQuestions && (
          <Section title="이해 확인 질문" defaultOpen={false}>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {editedResult.classroomMaterials.comprehensionQuestions.map((item, index) => (
                <div key={index} style={{ background: '#F8FAFC', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: '0.55rem', alignItems: 'end', marginBottom: '0.55rem' }}>
                    <label style={fieldLabelStyle}>
                      질문
                      <input className="input" value={item.question} onChange={(e) => updateComprehensionQuestion(index, { question: e.target.value })} style={{ marginTop: '0.25rem' }} />
                    </label>
                    <label style={fieldLabelStyle}>
                      난이도
                      <select className="input" value={item.difficulty || 'medium'} onChange={(e) => updateComprehensionQuestion(index, { difficulty: e.target.value as ComprehensionQuestion['difficulty'] })} style={{ marginTop: '0.25rem' }}>
                        <option value="easy">easy</option>
                        <option value="medium">medium</option>
                        <option value="hard">hard</option>
                      </select>
                    </label>
                    <button type="button" onClick={() => removeComprehensionQuestion(index)} className="btn btn-secondary" style={{ padding: '0.55rem', color: '#B91C1C' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <label style={fieldLabelStyle}>
                    답변
                    <textarea className="input" value={item.answer} onChange={(e) => updateComprehensionQuestion(index, { answer: e.target.value })} style={{ marginTop: '0.25rem', minHeight: 70, resize: 'vertical' }} />
                  </label>
                </div>
              ))}
              <button type="button" onClick={addComprehensionQuestion} className="btn btn-secondary" style={{ justifySelf: 'start', fontSize: '0.85rem' }}>
                <Plus size={15} /> 질문 추가
              </button>
            </div>
          </Section>
        )}

        <Section title="교사 노트" defaultOpen={false}>
          <textarea
            className="input"
            value={editedResult.teacherNotes.suggestedUsageKo}
            onChange={(e) => updateResult({ ...editedResult, teacherNotes: { ...editedResult.teacherNotes, suggestedUsageKo: e.target.value } })}
            style={{ minHeight: 100, resize: 'vertical', lineHeight: 1.7 }}
          />
        </Section>
      </div>
      <div style={{ marginTop: '1rem', color: '#A0AEC0', fontSize: '0.78rem' }}>
        출처: {content.url || url}
      </div>
      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
