// ─── Job status progression ───────────────────────────────────────────────────
export type JobStatus =
  | 'queued'
  | 'fetching_metadata'
  | 'fetching_transcript'
  | 'transcript_unavailable'
  | 'downloading_audio'
  | 'preprocessing_audio'
  | 'transcribing_audio'
  | 'normalizing_transcript'
  | 'generating_ai_result'
  | 'validating_output'
  | 'completed'
  | 'failed';

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  queued: '대기 중...',
  fetching_metadata: '영상 정보 수집 중...',
  fetching_transcript: '자막/스크립트 가져오는 중...',
  transcript_unavailable: '자막 없음 — 오디오 다운로드 준비 중...',
  downloading_audio: '오디오 다운로드 중...',
  preprocessing_audio: '오디오 전처리 중...',
  transcribing_audio: '음성 인식(STT) 처리 중...',
  normalizing_transcript: '스크립트 정규화 중...',
  generating_ai_result: 'AI 교재 생성 중...',
  validating_output: '결과 검증 중...',
  completed: '완료',
  failed: '처리 실패',
};

// ─── Request types ─────────────────────────────────────────────────────────────
export type TargetAudience =
  | 'middle_school'
  | 'high_school'
  | 'university'
  | 'adult'
  | 'travel'
  | 'business';

export type HskLevel = 'HSK1' | 'HSK2' | 'HSK3' | 'HSK4' | 'HSK5' | 'HSK6';

export type TranscriptSource = 'youtube_manual' | 'youtube_auto' | 'whisper' | 'manual';
export type TranscriptStatus = 'fetched' | 'unavailable' | 'failed';
export type AudioStatus =
  | 'not_needed'
  | 'downloaded'
  | 'processing'
  | 'transcribed'
  | 'deleted'
  | 'failed';

export type SaveAs =
  | 'lesson_material'
  | 'lesson_plan_section'
  | 'template'
  | 'generated_item';

export interface TranscriptPolicy {
  preferYouTubeCaption: boolean;
  allowAudioDownloadFallback: boolean;
  allowManualTranscriptFallback: boolean;
}

export interface OutputOptions {
  includeSummary: boolean;
  includeVocabulary: boolean;
  includeExpressions: boolean;
  includeGrammarPoints: boolean;
  includeComprehensionQuestions: boolean;
  includeDiscussionQuestions: boolean;
  includeWritingPrompt: boolean;
  includeLessonActivities: boolean;
}

export interface ImportJobLimits {
  maxVocabularyCount?: number;
  maxQuestionCount?: number;
  maxAudioDurationMinutes?: number;
}

export interface CreateImportJobRequest {
  sourceType: 'youtube';
  url: string;
  targetAudience: TargetAudience;
  hskLevel?: HskLevel;
  transcriptPolicy: TranscriptPolicy;
  outputOptions: OutputOptions;
  limits?: ImportJobLimits;
}

// ─── Internal service types ────────────────────────────────────────────────────
export interface YouTubeMetadata {
  videoId: string;
  originalUrl: string;
  title?: string;
  channelName?: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
}

export interface TranscriptAvailable {
  available: true;
  text: string;
  source: TranscriptSource;
}
export interface TranscriptUnavailable {
  available: false;
  reason: string;
}
export type TranscriptFetchResult = TranscriptAvailable | TranscriptUnavailable;

export interface AudioDownloadResult {
  filePath: string;
  durationSec?: number;
  fileSizeBytes?: number;
}

export interface AudioProcessResult {
  normalizedPath: string;
  chunkPaths: string[];
  jobDir: string;
}

// ─── AI result shape ───────────────────────────────────────────────────────────
export interface VocabularyItem {
  word: string;
  pinyin: string;
  meaning: string;
  exampleSentence?: string;
  hskLevel?: string;
}
export interface KeyExpression {
  expression: string;
  meaning: string;
  usage?: string;
}
export interface GrammarPoint {
  pattern: string;
  explanation: string;
  examples: string[];
}
export interface ComprehensionQuestion {
  question: string;
  answer: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}
export interface DiscussionQuestion {
  question: string;
  topic?: string;
}
export interface WritingPrompt {
  prompt: string;
  wordCount?: number;
  relatedVocabulary?: string[];
}
export interface ClassroomActivity {
  title: string;
  description: string;
  durationMinutes?: number;
  activityType?: string;
}

export interface ImportedYouTubeAIResult {
  title: string;
  sourceSummary: {
    shortSummaryKo: string;
    detailedSummaryKo: string;
    mainTopics: string[];
  };
  chineseLearningContent: {
    estimatedLevel: string;
    vocabulary: VocabularyItem[];
    keyExpressions: KeyExpression[];
    grammarPoints: GrammarPoint[];
  };
  classroomMaterials: {
    comprehensionQuestions: ComprehensionQuestion[];
    discussionQuestions: DiscussionQuestion[];
    writingPrompts: WritingPrompt[];
    activities: ClassroomActivity[];
  };
  teacherNotes: {
    cautionNotesKo: string;
    suggestedUsageKo: string;
  };
}

// ─── API response types ────────────────────────────────────────────────────────
export interface JobStatusResponse {
  importJobId: string;
  status: JobStatus;
  // source
  sourceUrl: string;
  videoId?: string;
  videoTitle?: string;
  channelName?: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
  // transcript
  transcriptSource?: TranscriptSource;
  transcriptStatus?: TranscriptStatus;
  // audio — paths intentionally omitted
  audioStatus?: AudioStatus;
  audioDeletedAt?: string;
  // STT
  sttProvider?: string;
  sttModel?: string;
  // AI
  aiResult?: ImportedYouTubeAIResult;
  // error
  error?: string;
  errorCode?: string;
  // timing
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveJobRequest {
  saveAs: SaveAs;
  courseId?: string;
  lessonId?: string;
  lessonPlanId?: string;
  materialId?: string;
  editedResult: ImportedYouTubeAIResult;
}
