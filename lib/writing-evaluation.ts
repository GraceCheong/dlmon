/**
 * Shared types, defaults, and pure helpers for the writing-evaluation feature.
 *
 * Keep this file framework-free (no React, no Next.js imports) so it can be
 * used from both API routes and components.
 */

export type RubricCriterion =
  | 'grammar'
  | 'vocabulary'
  | 'sentence_structure'
  | 'logical_coherence'
  | 'task_relevance'
  | 'naturalness';

export const RUBRIC_CRITERIA: ReadonlyArray<RubricCriterion> = [
  'grammar',
  'vocabulary',
  'sentence_structure',
  'logical_coherence',
  'task_relevance',
  'naturalness',
];

export interface DeductionPolicy {
  grammar: number;
  vocabulary: number;
  sentence_structure: number;
  logical_coherence: number;
  task_relevance: number;
  naturalness: number;
  [key: string]: number;
}

/** Per-criterion max deduction (sums to 100). */
export const DEFAULT_DEDUCTION_POLICY: DeductionPolicy = {
  grammar: 25,
  vocabulary: 20,
  sentence_structure: 15,
  logical_coherence: 15,
  task_relevance: 15,
  naturalness: 10,
};

/** Human-readable description per criterion (Korean) for prompt + UI. */
export const DEFAULT_CRITERIA_DESCRIPTION: Record<RubricCriterion, string> = {
  grammar: '문법 정확성: 시제, 어순, 조사, 양사 등의 정확성',
  vocabulary: '어휘 적절성: 단어 선택의 자연스러움과 정확성',
  sentence_structure: '문장 구조: 다양성, 복문 활용, 응집성',
  logical_coherence: '논리적 흐름: 단락 내·단락 간 일관성',
  task_relevance: '과제 부합도: 주제와 지시문에 부합하는 정도',
  naturalness: '자연스러움: 모국어 화자가 읽었을 때의 자연스러움',
};

export interface DefaultCriteria {
  description: Record<RubricCriterion, string>;
  weights: DeductionPolicy;
}

export const DEFAULT_CRITERIA: DefaultCriteria = {
  description: DEFAULT_CRITERIA_DESCRIPTION,
  weights: DEFAULT_DEDUCTION_POLICY,
};

export interface Deduction {
  criterion: RubricCriterion;
  amount: number;     // 0..max for that criterion
  reason: string;     // short Korean explanation
}

export interface SentenceFeedback {
  sentence: string;
  issues: string[];
  suggestion?: string;
}

export interface EvaluationResult {
  score100: number;
  score10: number;
  deductions: Deduction[];
  sentenceFeedback: SentenceFeedback[];
  overallSummary: string;
  languageValidationStatus: 'ok' | 'wrong_language' | 'unsupported';
}

/**
 * Compute final scores from a deductions array. Caps each per-criterion
 * deduction at the policy max, then derives score100 + score10.
 */
export function computeScores(
  deductions: Deduction[],
  policy: DeductionPolicy = DEFAULT_DEDUCTION_POLICY,
): { score100: number; score10: number; cappedDeductions: Deduction[] } {
  const totalsByCriterion: Partial<Record<RubricCriterion, number>> = {};
  const capped: Deduction[] = [];

  for (const d of deductions) {
    const max = policy[d.criterion] ?? 0;
    const running = totalsByCriterion[d.criterion] ?? 0;
    const remaining = Math.max(0, max - running);
    const amount = Math.max(0, Math.min(d.amount, remaining));
    if (amount === 0 && d.amount > 0) continue; // dropped — already at cap
    totalsByCriterion[d.criterion] = running + amount;
    capped.push({ ...d, amount });
  }

  const total = Object.values(totalsByCriterion).reduce((a, b) => a + (b ?? 0), 0);
  const score100 = Math.max(0, Math.round((100 - total) * 10) / 10);
  const score10 = Math.round((score100 / 10) * 10) / 10;
  return { score100, score10, cappedDeductions: capped };
}

/**
 * Builds the LLM prompt for evaluating a Chinese writing submission against a
 * rubric. Returns prompt + expected JSON schema as a string.
 */
export function buildEvaluationPrompt(args: {
  submissionText: string;
  assignmentPrompt: string;
  hskLevel: string;
  targetAudience: string;
  criteriaDescription: Record<string, string>;
  deductionPolicy: DeductionPolicy;
}): string {
  const { submissionText, assignmentPrompt, hskLevel, targetAudience } = args;
  return `당신은 중국어 작문 평가 전문가입니다. 학생의 작문을 아래 루브릭에 따라 평가해 주세요.

[과제 지시문]
${assignmentPrompt}

[수준]
${hskLevel} / 대상: ${targetAudience}

[학생 작문]
${submissionText}

[루브릭 기준 (감점 정책 — 각 항목 최대치)]
${RUBRIC_CRITERIA.map((c) => `- ${c} (max ${args.deductionPolicy[c]}): ${args.criteriaDescription[c]}`).join('\n')}

[지시]
1) 학생의 작문이 중국어인지 먼저 확인합니다. 중국어가 아니면 languageValidationStatus를 "wrong_language"로 표시하고 점수는 0으로 처리합니다.
2) 각 기준별로 적절한 감점을 부여합니다 (0 ~ max). 감점 항목마다 짧은 한국어 사유를 적습니다.
3) 문장 단위 피드백을 작성합니다. 문제가 있는 문장에 대해 issues와 suggestion을 채워 주세요.
4) overallSummary에 5문장 이내의 종합 코멘트를 작성합니다.
5) 다음 JSON으로만 응답합니다:

{
  "languageValidationStatus": "ok" | "wrong_language" | "unsupported",
  "deductions": [
    { "criterion": "grammar" | "vocabulary" | "sentence_structure" | "logical_coherence" | "task_relevance" | "naturalness",
      "amount": number,
      "reason": "한국어 사유" }
  ],
  "sentenceFeedback": [
    { "sentence": "원문", "issues": ["문제점"], "suggestion": "개선안" }
  ],
  "overallSummary": "한국어 종합 코멘트"
}`;
}

/**
 * Builds the LLM prompt for generating a brand-new writing rubric.
 */
export function buildRubricGenerationPrompt(args: {
  hskLevel: string;
  targetAudience: string;
  assignmentPrompt?: string;
}): string {
  return `당신은 중국어 작문 루브릭 설계 전문가입니다. 아래 조건에 맞는 평가 루브릭을 작성해 주세요.

수준: ${args.hskLevel}
대상: ${args.targetAudience}
${args.assignmentPrompt ? `과제 예시: ${args.assignmentPrompt}` : ''}

다음 JSON으로만 응답합니다:
{
  "criteria": {
    "grammar": "이 수준에서 평가해야 할 문법 포인트(2~3문장)",
    "vocabulary": "...",
    "sentence_structure": "...",
    "logical_coherence": "...",
    "task_relevance": "...",
    "naturalness": "..."
  },
  "deductionPolicy": {
    "grammar": 25, "vocabulary": 20, "sentence_structure": 15,
    "logical_coherence": 15, "task_relevance": 15, "naturalness": 10
  }
}

deductionPolicy 합계는 반드시 100이어야 합니다. 위 기본값을 수정해도 좋지만 합계는 유지하세요.`;
}

/**
 * Validates that an LLM-returned object matches our expected EvaluationResult
 * shape, falling back gracefully when fields are missing.
 */
export function normalizeEvaluationResult(raw: unknown, policy: DeductionPolicy): EvaluationResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  const lang = r.languageValidationStatus;
  const languageValidationStatus: EvaluationResult['languageValidationStatus'] =
    lang === 'wrong_language' || lang === 'unsupported' ? lang : 'ok';

  const rawDeductions = Array.isArray(r.deductions) ? (r.deductions as unknown[]) : [];
  const deductions: Deduction[] = rawDeductions
    .map((d) => {
      const x = (d ?? {}) as Record<string, unknown>;
      const criterion = x.criterion;
      if (typeof criterion !== 'string' || !(RUBRIC_CRITERIA as readonly string[]).includes(criterion)) {
        return null;
      }
      const amount = typeof x.amount === 'number' ? x.amount : 0;
      const reason = typeof x.reason === 'string' ? x.reason : '';
      return { criterion: criterion as RubricCriterion, amount, reason };
    })
    .filter((d): d is Deduction => d !== null);

  const rawSentences = Array.isArray(r.sentenceFeedback) ? (r.sentenceFeedback as unknown[]) : [];
  const sentenceFeedback: SentenceFeedback[] = rawSentences
    .map((s): SentenceFeedback | null => {
      const x = (s ?? {}) as Record<string, unknown>;
      if (typeof x.sentence !== 'string') return null;
      return {
        sentence: x.sentence,
        issues: Array.isArray(x.issues) ? (x.issues as unknown[]).filter((i): i is string => typeof i === 'string') : [],
        suggestion: typeof x.suggestion === 'string' ? x.suggestion : undefined,
      };
    })
    .filter((s): s is SentenceFeedback => s !== null);

  const overallSummary = typeof r.overallSummary === 'string' ? r.overallSummary : '';

  // Wrong language → zero out scores per spec.
  if (languageValidationStatus !== 'ok') {
    return {
      score100: 0,
      score10: 0,
      deductions: [],
      sentenceFeedback,
      overallSummary: overallSummary || 'Language validation failed: submission is not in the target language.',
      languageValidationStatus,
    };
  }

  const { score100, score10, cappedDeductions } = computeScores(deductions, policy);
  return {
    score100,
    score10,
    deductions: cappedDeductions,
    sentenceFeedback,
    overallSummary,
    languageValidationStatus,
  };
}
