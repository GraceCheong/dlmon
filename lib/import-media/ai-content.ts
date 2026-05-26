import { ollamaGenerate, parseOllamaJSON, MODELS } from '@/lib/ollama';
import { defaultModel } from '@/lib/ai/client';
import type { ImportedYouTubeAIResult, OutputOptions, TargetAudience, HskLevel } from './types';

const TARGET_AUDIENCE_LABELS: Record<TargetAudience, string> = {
  middle_school: '중학생',
  high_school: '고등학생',
  university: '대학생',
  adult: '성인 일반',
  travel: '여행 목적 학습자',
  business: '비즈니스 중국어 학습자',
};

const SYSTEM_PROMPT = `You are an expert Chinese language teacher and curriculum designer. Transform a YouTube transcript into structured Chinese learning materials for Korean-speaking teachers and students. Output valid JSON only. Do not use Markdown. Do not invent facts not supported by the transcript. Korean-facing explanations must be in Korean. Chinese examples must use Simplified Chinese. Match the requested HSK level when provided. Always extract and reconstruct the actual spoken dialogue from the transcript into the dialogScript field — identify speakers where possible, provide pinyin, and add Korean translations. The dialogScript is mandatory for all videos.`;

function buildUserPrompt(args: {
  transcriptText: string;
  transcriptSource: string;
  videoTitle?: string;
  channelName?: string;
  durationSeconds?: number;
  originalUrl: string;
  targetAudience: TargetAudience;
  hskLevel?: HskLevel;
  outputOptions: OutputOptions;
}): string {
  const {
    transcriptText, transcriptSource, videoTitle, channelName,
    durationSeconds, originalUrl, targetAudience, hskLevel, outputOptions,
  } = args;

  return `Generate structured Chinese learning materials from this YouTube transcript.

Metadata:
Title: ${videoTitle ?? '(unknown)'}
Channel: ${channelName ?? '(unknown)'}
Duration Seconds: ${durationSeconds ?? '(unknown)'}
Original URL: ${originalUrl}

Teaching:
Target Audience: ${TARGET_AUDIENCE_LABELS[targetAudience]}
Requested HSK Level: ${hskLevel ?? 'null'}
Output Options: ${JSON.stringify(outputOptions, null, 2)}

Transcript Source: ${transcriptSource}

Transcript:
${transcriptText.slice(0, 12000)}

Return only JSON matching exactly this structure:
{
  "title": "string — Korean lesson title derived from the video",
  "sourceSummary": {
    "shortSummaryKo": "string — 2-3 sentence Korean summary",
    "detailedSummaryKo": "string — detailed Korean summary (5-8 sentences)",
    "mainTopics": ["string"]
  },
  "chineseLearningContent": {
    "estimatedLevel": "string — e.g. HSK3",
    "vocabulary": [{"word":"","pinyin":"","meaning":"(Korean)","exampleSentence":"","hskLevel":""}],
    "keyExpressions": [{"expression":"","meaning":"(Korean)","usage":""}],
    "grammarPoints": [{"pattern":"","explanation":"(Korean)","examples":[""]}]
  },
  "dialogScript": {
    "lines": [{"speaker":"(character name or A/B)","chinese":"(Chinese dialogue line)","pinyin":"(pinyin)","korean":"(Korean translation)"}],
    "notesKo": "string — optional notes about the dialogue scene or context in Korean"
  },
  "classroomMaterials": {
    "comprehensionQuestions": [{"question":"(Korean)","answer":"(Korean)","difficulty":"easy|medium|hard"}],
    "discussionQuestions": [{"question":"(Korean)","topic":""}],
    "writingPrompts": [{"prompt":"(Korean)","wordCount":80,"relatedVocabulary":[""]}],
    "activities": [{"title":"(Korean)","description":"(Korean)","durationMinutes":10,"activityType":""}]
  },
  "teacherNotes": {
    "cautionNotesKo": "string — pronunciation or cultural caution points in Korean",
    "suggestedUsageKo": "string — how to use this material in class (Korean)"
  }
}`;
}

function validateAIResult(raw: unknown): raw is ImportedYouTubeAIResult {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as Record<string, unknown>;
  return (
    typeof r.title === 'string' &&
    r.sourceSummary != null &&
    r.chineseLearningContent != null &&
    r.classroomMaterials != null &&
    r.teacherNotes != null
  );
}

function repairAIResult(raw: unknown): ImportedYouTubeAIResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  const ss = (r.sourceSummary ?? {}) as Record<string, unknown>;
  const cl = (r.chineseLearningContent ?? {}) as Record<string, unknown>;
  const cm = (r.classroomMaterials ?? {}) as Record<string, unknown>;
  const tn = (r.teacherNotes ?? {}) as Record<string, unknown>;

  return {
    title: typeof r.title === 'string' ? r.title : '(제목 없음)',
    sourceSummary: {
      shortSummaryKo: typeof ss.shortSummaryKo === 'string' ? ss.shortSummaryKo : '',
      detailedSummaryKo: typeof ss.detailedSummaryKo === 'string' ? ss.detailedSummaryKo : '',
      mainTopics: Array.isArray(ss.mainTopics) ? ss.mainTopics as string[] : [],
    },
    chineseLearningContent: {
      estimatedLevel: typeof cl.estimatedLevel === 'string' ? cl.estimatedLevel : '',
      vocabulary: Array.isArray(cl.vocabulary) ? cl.vocabulary as ImportedYouTubeAIResult['chineseLearningContent']['vocabulary'] : [],
      keyExpressions: Array.isArray(cl.keyExpressions) ? cl.keyExpressions as ImportedYouTubeAIResult['chineseLearningContent']['keyExpressions'] : [],
      grammarPoints: Array.isArray(cl.grammarPoints) ? cl.grammarPoints as ImportedYouTubeAIResult['chineseLearningContent']['grammarPoints'] : [],
    },
    classroomMaterials: {
      comprehensionQuestions: Array.isArray(cm.comprehensionQuestions) ? cm.comprehensionQuestions as ImportedYouTubeAIResult['classroomMaterials']['comprehensionQuestions'] : [],
      discussionQuestions: Array.isArray(cm.discussionQuestions) ? cm.discussionQuestions as ImportedYouTubeAIResult['classroomMaterials']['discussionQuestions'] : [],
      writingPrompts: Array.isArray(cm.writingPrompts) ? cm.writingPrompts as ImportedYouTubeAIResult['classroomMaterials']['writingPrompts'] : [],
      activities: Array.isArray(cm.activities) ? cm.activities as ImportedYouTubeAIResult['classroomMaterials']['activities'] : [],
    },
    dialogScript: (() => {
      const ds = r.dialogScript as Record<string, unknown> | null | undefined;
      if (!ds) return undefined;
      const lines = Array.isArray(ds.lines) ? ds.lines as NonNullable<ImportedYouTubeAIResult['dialogScript']>['lines'] : [];
      return { lines, notesKo: typeof ds.notesKo === 'string' ? ds.notesKo : undefined };
    })(),
    teacherNotes: {
      cautionNotesKo: typeof tn.cautionNotesKo === 'string' ? tn.cautionNotesKo : '',
      suggestedUsageKo: typeof tn.suggestedUsageKo === 'string' ? tn.suggestedUsageKo : '',
    },
  };
}

export interface AIContentResult {
  result: ImportedYouTubeAIResult;
  rawResponse: string;
  provider: string;
  model: string;
}

export async function generateImportedContent(args: {
  transcriptText: string;
  transcriptSource: string;
  videoTitle?: string;
  channelName?: string;
  durationSeconds?: number;
  originalUrl: string;
  targetAudience: TargetAudience;
  hskLevel?: HskLevel;
  outputOptions: OutputOptions;
}): Promise<AIContentResult> {
  // Use the configured default model (LOCAL_LLM_MODEL env var) so this works
  // with whatever model the user has installed, not just qwen3:30b.
  const model = defaultModel;
  const userPrompt = buildUserPrompt(args);

  const rawResponse = await ollamaGenerate({
    model,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    jsonMode: true,
    temperature: 0.3,
  });

  let parsed: unknown;
  try {
    parsed = parseOllamaJSON(rawResponse);
  } catch {
    // Attempt once more with a stricter JSON extraction
    const match = rawResponse.match(/\{[\s\S]*\}/);
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch { parsed = null; }
    }
  }

  let result: ImportedYouTubeAIResult;
  if (validateAIResult(parsed)) {
    result = parsed;
  } else {
    // Repair — fill missing fields with safe defaults
    console.warn('[ai-content] AI result failed validation; applying repair.');
    result = repairAIResult(parsed);
  }

  return {
    result,
    rawResponse,
    provider: 'local-openai-compatible',
    model,
  };
}
