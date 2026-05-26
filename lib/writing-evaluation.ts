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

const HSK_DEFAULT_CRITERIA: Record<string, DefaultCriteria> = {
  HSK1: {
    description: {
      grammar: '기초 문법 정확성: 是/有, 기본 어순, 의문문, 부정문 등 HSK1 핵심 구조를 정확히 사용하는지 평가',
      vocabulary: '기초 어휘 적절성: 자기소개, 가족, 시간, 장소 등 HSK1 생활 어휘를 의미에 맞게 사용하는지 평가',
      sentence_structure: '기본문 구성: 짧고 단순한 문장을 완성형으로 쓸 수 있는지, 누락된 주어·동사가 없는지 평가',
      logical_coherence: '기초 연결성: 문장들이 주제에서 벗어나지 않고 간단한 순서로 이어지는지 평가',
      task_relevance: '과제 부합도: 요구된 정보와 핵심 답변을 빠뜨리지 않았는지 평가',
      naturalness: '초급 자연스러움: 완벽한 자연스러움보다 이해 가능한 표현과 기초 중국어다운 표현을 우선 평가',
    },
    weights: { grammar: 20, vocabulary: 20, sentence_structure: 15, logical_coherence: 10, task_relevance: 30, naturalness: 5 },
  },
  HSK2: {
    description: {
      grammar: '초급 문법 정확성: 了, 过, 在, 比, 要/想 등 HSK2 기본 문형을 상황에 맞게 사용하는지 평가',
      vocabulary: '초급 어휘 적절성: 일상 활동, 취미, 이동, 약속 등 HSK2 어휘를 정확히 선택하는지 평가',
      sentence_structure: '문장 확장: 시간·장소·목적어를 포함한 문장을 안정적으로 구성하는지 평가',
      logical_coherence: '간단한 흐름: 이유, 시간 순서, 대조가 독자가 이해할 수 있게 연결되는지 평가',
      task_relevance: '과제 부합도: 지시문에서 요구한 항목을 모두 다루고 분량을 적절히 채웠는지 평가',
      naturalness: '초급 자연스러움: 직역투를 줄이고 기본적인 중국어 표현 습관을 따르는지 평가',
    },
    weights: { grammar: 20, vocabulary: 20, sentence_structure: 15, logical_coherence: 12, task_relevance: 25, naturalness: 8 },
  },
  HSK3: DEFAULT_CRITERIA,
  HSK4: {
    description: {
      grammar: '중급 문법 정확성: 把/被, 보어, 접속 구조, 복문을 오류 없이 목적에 맞게 사용하는지 평가',
      vocabulary: '중급 어휘 적절성: 추상적 의견, 감정, 사회생활 관련 어휘를 정확하고 다양하게 사용하는지 평가',
      sentence_structure: '문장 구조 다양성: 단문과 복문을 균형 있게 사용하고 문장 간 응집성을 유지하는지 평가',
      logical_coherence: '논리 전개: 주장, 근거, 예시가 분명하며 단락 안의 흐름이 자연스러운지 평가',
      task_relevance: '과제 부합도: 질문의 의도에 맞게 핵심 내용을 충분히 설명하는지 평가',
      naturalness: '표현 자연스러움: 어색한 직역을 줄이고 중급 수준의 자연스러운 중국어 표현을 사용하는지 평가',
    },
    weights: { grammar: 22, vocabulary: 20, sentence_structure: 18, logical_coherence: 17, task_relevance: 13, naturalness: 10 },
  },
  HSK5: {
    description: {
      grammar: '상급 문법 운용: 복잡한 문형과 담화 연결 표현을 정확하고 유연하게 사용하는지 평가',
      vocabulary: '상급 어휘 적절성: 주제별 전문·추상 어휘를 정확히 선택하고 반복을 줄이는지 평가',
      sentence_structure: '문장 구성 완성도: 긴 문장과 복합 구조를 명료하게 구성하고 과도한 중복을 피하는지 평가',
      logical_coherence: '논증 구조: 주장, 근거, 반론, 결론이 일관되게 이어지는지 평가',
      task_relevance: '과제 부합도: 주제를 깊이 있게 다루며 요구된 관점과 조건을 충족하는지 평가',
      naturalness: '상급 자연스러움: 실제 중국어 문어체에 가까운 표현, 어감, 결합 관계를 사용하는지 평가',
    },
    weights: { grammar: 20, vocabulary: 20, sentence_structure: 18, logical_coherence: 20, task_relevance: 12, naturalness: 10 },
  },
  HSK6: {
    description: {
      grammar: '고급 문법 정밀도: 문법 오류가 거의 없고 복잡한 구조를 문맥에 맞게 정교하게 조절하는지 평가',
      vocabulary: '고급 어휘·어감: 추상 개념, 관용 표현, 뉘앙스를 정확히 활용하고 어휘 선택이 세련된지 평가',
      sentence_structure: '문체와 구조: 문장 길이, 리듬, 강조 구조를 조절해 명료하고 설득력 있게 쓰는지 평가',
      logical_coherence: '고급 담화 구성: 논리적 비약 없이 관점, 근거, 예시, 결론이 긴밀하게 연결되는지 평가',
      task_relevance: '과제 완성도: 주제를 깊이 분석하고 지시문이 요구한 관점과 범위를 충실히 만족하는지 평가',
      naturalness: '원어민 수준 자연스러움: 문어체 관습, 결합 관계, 표현 밀도가 자연스럽고 품격 있는지 평가',
    },
    weights: { grammar: 18, vocabulary: 20, sentence_structure: 18, logical_coherence: 22, task_relevance: 10, naturalness: 12 },
  },
};

export function normalizeHskLevel(hskLevel?: string): string {
  const normalized = hskLevel?.trim().toUpperCase().replace(/\s+/g, '');
  return normalized && HSK_DEFAULT_CRITERIA[normalized] ? normalized : 'HSK3';
}

export function getDefaultCriteriaDescription(hskLevel?: string): Record<RubricCriterion, string> {
  return HSK_DEFAULT_CRITERIA[normalizeHskLevel(hskLevel)].description;
}

export function getDefaultDeductionPolicy(hskLevel?: string): DeductionPolicy {
  return HSK_DEFAULT_CRITERIA[normalizeHskLevel(hskLevel)].weights;
}

export interface Deduction {
  criterion: RubricCriterion;
  amount: number;     // 0..max for that criterion
  reason: string;     // short Korean explanation
}

export interface CriterionEvaluation {
  criterion: RubricCriterion;
  maxDeduction: number;
  deduction: number;
  score: number;
  evidence: string;
  explanation: string;
}

export interface SentenceFeedback {
  sentence: string;
  issues: string[];
  suggestion?: string;
}

export interface EvaluationResult {
  score100: number;
  score10: number;
  criterionResults: CriterionEvaluation[];
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

function getHskLeniencyGuideline(hskLevel: string): string {
  const level = normalizeHskLevel(hskLevel);
  const guidelines: Record<string, string> = {
    HSK1: '완전한 기초 단계입니다. 과제에서 요구한 내용을 오류 없이 수행했다면 100점입니다. 감점은 실제 오류(틀린 글자·어휘·문법)가 있을 때만 진행합니다. 문장이 짧고 단순한 것, 어휘가 제한적인 것은 감점 대상이 아닙니다. 동일한 오류가 반복되면 항목당 1회만 감점합니다.',
    HSK2: '초급 단계입니다. 과제에서 요구한 내용을 오류 없이 수행했다면 100점입니다. 감점은 실제 오류(틀린 글자·어휘·문법)가 있을 때만 진행합니다. 배운 문형을 올바르게 사용하는 시도는 긍정적으로 평가합니다. 문장이 짧고 단순한 것, 어휘 다양성이 낮은 것은 감점 대상이 아닙니다.',
    HSK3: '중급 초반입니다. 과제에서 요구한 내용을 오류 없이 수행했다면 100점입니다. 감점은 실제 오류(틀린 글자·어휘·문법)가 있을 때만 진행합니다. 복문 접속사·비교문 등 요구 문형을 정확히 사용했다면 문장 길이나 어휘 다양성으로 감점하지 마세요. 문법적으로 허용되는 표현(예: 我的哥哥 vs 我哥哥)은 오류가 아닙니다.',
    HSK4: '중급 단계입니다. 과제에서 요구한 내용을 오류 없이 수행했다면 100점입니다. 감점은 실제 오류(틀린 글자·어휘·문법)가 있을 때만 진행합니다. 표현이 다소 단순해도 과제 지시를 충실히 이행했다면 감점하지 마세요. 어색함은 오류가 아닙니다—감점은 틀린 것에만 적용합니다.',
    HSK5: '상급 단계입니다. 높은 정확성을 기대하지만 창의적 표현과 복잡한 논증 시도는 긍정적으로 봅니다. 일부 어색한 표현이나 어휘 선택은 허용 범위 내로 봅니다.',
    HSK6: '최고 단계입니다. 전반적 완성도와 논증의 깊이를 중심으로 평가합니다. 창의적이고 고급스러운 표현은 낮은 감점으로 보상합니다.',
  };
  return guidelines[level] ?? guidelines['HSK3'];
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

[수준별 채점 지침]
${getHskLeniencyGuideline(hskLevel)}

[채점 원칙]
- 학생의 성장을 돕는 방향으로 채점합니다. 명확한 오류만 감점하고 모호한 경우 학생에게 유리하게 판단합니다.
- 평균 감점은 각 항목 최대치의 50% 이하를 목표로 합니다. 최대치 근처 감점은 심각하고 반복적인 오류가 여러 개 있을 때만 사용합니다.
- 과제 지시를 충실히 이행하고 의사소통 목적이 달성되었다면 소소한 오류는 최소 감점합니다.
- 전반적으로 긍정적인 피드백을 포함하고, 개선점은 구체적으로 안내합니다.
- 【중요】과제 지시문이 특정 형식을 명시한 경우(예: "각 문형을 한 문장씩", "5~7문장"), 그 형식에서 필연적으로 발생하는 제약(짧은 문장, 제한적 어휘 다양성, 문장 간 단락 연결 부재)은 감점 대상이 아닙니다. 형식을 준수한 것을 오히려 과제 부합으로 봅니다.
- 【중요】문법적으로 허용되는 표현은 더 자연스러운 대안이 있더라도 감점하지 마세요. 두 표현 모두 표준 중국어에서 옳다면 오류가 아닙니다. 예: '我的哥哥'와 '我哥哥'는 모두 정확한 표현입니다.
- 【HSK4 이하 핵심 규칙】과제에서 요구한 문형·내용을 오류 없이 수행했다면 기본 점수는 100점입니다. 감점은 오직 실제 오류(틀린 글자, 문법 오류, 잘못된 어휘 사용)가 있을 때만 진행합니다. 문장 길이, 어휘 다양성, 표현의 단순함, 스타일 차이는 감점 사유가 아닙니다.
- HSK5 이상은 내용의 깊이·논증 구조·어휘 다양성도 채점하지만, HSK4 이하에서는 "틀린 것이 있는가"만 묻습니다.

[학생 작문]
${submissionText}

[루브릭 기준 (감점 정책 — 각 항목 최대치)]
${RUBRIC_CRITERIA.map((c) => `- ${c} (max ${args.deductionPolicy[c]}): ${args.criteriaDescription[c]}`).join('\n')}

[지시]
1) 학생의 작문이 중국어인지 먼저 확인합니다. 중국어가 아니면 languageValidationStatus를 "wrong_language"로 표시하고 점수는 0으로 처리합니다.
2) 각 루브릭 기준별로 감점, 근거가 된 학생 원문 표현, 한국어 설명을 작성합니다.
3) 각 기준별 감점은 0 ~ max 범위이며 score는 max - deduction입니다.
4) 문장 단위 피드백은 문제가 있는 문장만 작성하고 잘 쓴 문장은 칭찬을 포함합니다.
5) overallSummary에 5문장 이내의 종합 코멘트를 작성합니다. 긍정적인 내용을 먼저 언급하고 개선점으로 마무리합니다.
6) 다음 JSON으로만 응답합니다:

{
  "languageValidationStatus": "ok" | "wrong_language" | "unsupported",
  "criterionResults": [
    {
      "criterion": "grammar" | "vocabulary" | "sentence_structure" | "logical_coherence" | "task_relevance" | "naturalness",
      "maxDeduction": number,
      "deduction": number,
      "score": number,
      "evidence": "학생 원문에서 채점 근거가 된 표현 또는 문장",
      "explanation": "이 기준에서 왜 이렇게 채점했는지에 대한 한국어 설명"
    }
  ],
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
  const criteria = getDefaultCriteriaDescription(args.hskLevel);
  const policy = getDefaultDeductionPolicy(args.hskLevel);

  return `당신은 중국어 작문 루브릭 설계 전문가입니다. 아래 조건에 맞는 평가 루브릭을 작성해 주세요.

수준: ${args.hskLevel}
대상: ${args.targetAudience}
${args.assignmentPrompt ? `과제 예시: ${args.assignmentPrompt}` : ''}

아래 ${normalizeHskLevel(args.hskLevel)} 기본 루브릭을 기준으로 대상과 과제에 맞게 구체화하세요:
${RUBRIC_CRITERIA.map((c) => `- ${c} (max ${policy[c]}): ${criteria[c]}`).join('\n')}

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
    "grammar": ${policy.grammar}, "vocabulary": ${policy.vocabulary}, "sentence_structure": ${policy.sentence_structure},
    "logical_coherence": ${policy.logical_coherence}, "task_relevance": ${policy.task_relevance}, "naturalness": ${policy.naturalness}
  }
}

deductionPolicy 합계는 반드시 100이어야 합니다. 수준별 기본 배점을 크게 벗어나지 마세요.`;
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
  const rawCriterionResults = Array.isArray(r.criterionResults) ? (r.criterionResults as unknown[]) : [];
  const criterionResultMap = new Map<RubricCriterion, Partial<CriterionEvaluation>>();
  for (const item of rawCriterionResults) {
    const x = (item ?? {}) as Record<string, unknown>;
    const criterion = x.criterion;
    if (typeof criterion !== 'string' || !(RUBRIC_CRITERIA as readonly string[]).includes(criterion)) continue;
    const parsedResult: Partial<CriterionEvaluation> = { criterion: criterion as RubricCriterion };
    if (typeof x.maxDeduction === 'number') parsedResult.maxDeduction = x.maxDeduction;
    if (typeof x.deduction === 'number') parsedResult.deduction = x.deduction;
    if (typeof x.score === 'number') parsedResult.score = x.score;
    if (typeof x.evidence === 'string') parsedResult.evidence = x.evidence;
    if (typeof x.explanation === 'string') parsedResult.explanation = x.explanation;
    criterionResultMap.set(criterion as RubricCriterion, parsedResult);
  }

  const buildCriterionResults = (cappedDeductions: Deduction[]): CriterionEvaluation[] => (
    RUBRIC_CRITERIA.map((criterion) => {
      const maxDeduction = policy[criterion] ?? 0;
      const criterionDeductions = cappedDeductions.filter((deduction) => deduction.criterion === criterion);
      const deduction = criterionDeductions.reduce((sum, item) => sum + item.amount, 0);
      const rawResult = criterionResultMap.get(criterion);
      const reasons = criterionDeductions.map((item) => item.reason).filter(Boolean).join(' / ');

      return {
        criterion,
        maxDeduction,
        deduction,
        score: Math.max(0, maxDeduction - deduction),
        evidence: rawResult?.evidence || (reasons ? '감점 사유 참조' : '뚜렷한 감점 근거 없음'),
        explanation: rawResult?.explanation || reasons || '이 기준에서는 큰 문제가 발견되지 않았습니다.',
      };
    })
  );

  // Wrong language → zero out scores per spec.
  if (languageValidationStatus !== 'ok') {
    const fullDeductions = RUBRIC_CRITERIA.map((criterion) => ({
      criterion,
      amount: policy[criterion] ?? 0,
      reason: '대상 언어가 아닌 답안이므로 해당 기준을 평가할 수 없습니다.',
    }));
    return {
      score100: 0,
      score10: 0,
      criterionResults: buildCriterionResults(fullDeductions),
      deductions: fullDeductions,
      sentenceFeedback,
      overallSummary: overallSummary || 'Language validation failed: submission is not in the target language.',
      languageValidationStatus,
    };
  }

  const { score100, score10, cappedDeductions } = computeScores(deductions, policy);
  return {
    score100,
    score10,
    criterionResults: buildCriterionResults(cappedDeductions),
    deductions: cappedDeductions,
    sentenceFeedback,
    overallSummary,
    languageValidationStatus,
  };
}

export function safeParseJson<T = unknown>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
