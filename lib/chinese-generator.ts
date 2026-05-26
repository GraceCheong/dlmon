export type GeneratorMode = 'vocabulary' | 'sentence';

export interface GenerateChineseOptions {
  mode: GeneratorMode;
  topic: string;
  hskLevel: string;
  targetAudience: string;
  count: number;
  grammarPattern?: string;
  context?: string;
}

export interface VocabularyItem {
  chinese: string;
  pinyin: string;
  meaning: string;
  example: string;
  examplePinyin?: string;
  exampleMeaning: string;
}

export interface SentenceItem {
  chinese: string;
  pinyin: string;
  meaning: string;
  grammarNote?: string;
}

export type GeneratedResultItem = VocabularyItem | SentenceItem;

export function buildChineseGeneratorPrompt(opts: GenerateChineseOptions): string {
  const {
    mode, topic, hskLevel, targetAudience, count,
    grammarPattern, context,
  } = opts;

  const modeDesc = mode === 'vocabulary' ? '어휘' : '예문';
  const audienceNote = targetAudience ? `학습자 유형: ${targetAudience}` : '';
  const grammarNote = grammarPattern ? `문법 패턴: ${grammarPattern}` : '';
  const contextNote = context ? `맥락/주제: ${context}` : '';

  if (mode === 'vocabulary') {
    return `
당신은 중국어 교육 전문가입니다. ${hskLevel} 수준의 ${modeDesc} ${count}개를 생성해 주세요.
주제: ${topic}
${audienceNote}
${grammarNote}
${contextNote}

다음 JSON 배열 형식으로만 응답하세요 (설명 없이):
[
  {
    "chinese": "汉字",
    "pinyin": "hàn zì",
    "meaning": "한국어 뜻",
    "example": "예문 (중국어)",
    "examplePinyin": "예문 (병음)",
    "exampleMeaning": "예문 (한국어)"
  }
]

정확히 ${count}개의 항목을 포함해야 합니다. ${hskLevel} 수준에 적합한 단어를 선택하세요.
`.trim();
  }

  return `
당신은 중국어 교육 전문가입니다. ${hskLevel} 수준의 예문 ${count}개를 생성해 주세요.
주제: ${topic}
${audienceNote}
${grammarNote}
${contextNote}

다음 JSON 배열 형식으로만 응답하세요 (설명 없이):
[
  {
    "chinese": "중국어 예문",
    "pinyin": "병음",
    "meaning": "한국어 번역",
    "grammarNote": "문법 포인트 설명 (선택)"
  }
]

정확히 ${count}개의 예문을 포함해야 합니다.
`.trim();
}
