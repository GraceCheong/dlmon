import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';
import { generateAiText } from '@/lib/ai/generate';
import { cleanAiJsonResponse, getAiErrorMessage, rubricAiTimeoutMs } from '@/lib/ai/client';

interface GenerateAssignmentBody {
  assignmentId: string;
  hskLevel?: string;
  targetAudience?: string;
  type?: string;
}

// Level-appropriate expressions, grammar patterns, and structures per HSK level.
// These are candidate pools — the LLM picks 1–2 that fit the lesson topic.
const HSK_GRAMMAR_PATTERNS: Record<string, string[]> = {
  HSK1: [
    // 기본 문형
    '我叫……', '我是……人', '我今年……岁',
    '这是……', '那是……', '……在哪儿？',
    // 술어
    '是……', '有……', '在……',
    // 부정·의문
    '不……', '没有……', '……吗？', '……呢？',
    // 연결·묘사
    '也……', '都……', '很……',
  ],
  HSK2: [
    // 완료·경험
    '……了', '……过', '已经……了',
    // 조동사
    '想……', '要……', '会……', '能……', '可以……',
    // 비교
    '……比……', '没有……那么……',
    // 순서·시간
    '先……然后……', '……的时候', '一起……',
    // 원인·결과
    '因为……所以……',
    // 표현
    '我觉得……', '我喜欢……因为……', '我打算……',
  ],
  HSK3: [
    // 역접·양보
    '虽然……但是……', '尽管……但……',
    // 동시진행
    '一边……一边……',
    // 점층·변화
    '越来越……', '不但……而且……',
    // 조건
    '如果……就……', '只要……就……',
    // 제외·추가
    '除了……以外，还……',
    // 수동·처치
    '被……', '把……',
    // 감정·태도
    '对……感兴趣', '觉得……很重要',
    // 서술 표현
    '我认为……', '给我留下了深刻的印象',
    // 전후
    '先……再……然后……',
  ],
  HSK4: [
    // 점층
    '不仅……还……', '不但……甚至……',
    // 관점·입장
    '对……来说', '从……的角度来看',
    // 조건·필수
    '只有……才……', '除非……否则……',
    // 양보·역접
    '即使……也……', '尽管……还是……',
    // 원인
    '由于……', '之所以……是因为……',
    // 점진
    '随着……', '随着……的发展',
    // 강조
    '连……都……也……',
    // 방법·수단
    '通过……', '利用……',
    // 비교·선택
    '与其……不如……',
    // 결과·전환
    '从而……', '因此……',
  ],
  HSK5: [
    // 양보·강조
    '固然……但是……', '诚然……然而……',
    // 조건·가정
    '一旦……就……', '倘若……则……',
    // 역접·반전
    '反而……', '不但没有……反而……',
    // 누진
    '不仅如此……', '更重要的是……',
    // 추론·결론
    '由此可见……', '可见……',
    // 불가피
    '不得不……', '迫不得已……',
    // 양자택일
    '宁可……也不……', '宁愿……也要……',
    // 논증 표현
    '从某种意义上说……', '不可否认……',
    '以……为例', '事实上……',
    // 복합 전환
    '既然……就……', '无论……都……',
  ],
  HSK6: [
    // 고급 가정·조건
    '鉴于……', '在……的前提下', '以……为前提',
    // 고급 관점
    '就……而言', '就……角度而言', '从……层面看',
    // 고급 역접
    '非但……反而……', '纵然……也……', '凡是……都……',
    // 논리 전개
    '综上所述……', '总而言之……', '由此推断……',
    // 강조·한정
    '值得注意的是……', '不容忽视的是……',
    // 고급 인과
    '究其原因……', '追根溯源……',
    // 고급 양보
    '尽管如此……', '话虽如此……',
    // 문어체 전환
    '然而……', '况且……', '何况……',
  ],
};

// Sentence count / length guidance per level
const HSK_LENGTH_GUIDE: Record<string, string> = {
  HSK1: '3~4句话 (3~4문장)',
  HSK2: '4~5句话 (4~5문장)',
  HSK3: '5~7句话 (5~7문장)',
  HSK4: '4~6句话 (4~6문장)',
  HSK5: '150字以上 (150자 이상)',
  HSK6: '200字以上 (200자 이상)',
};

// HSK4+ instructions go in Chinese; HSK1-3 use Korean with Chinese patterns shown
function getInstructionLanguage(hskLevel: string): 'ko' | 'zh' {
  const n = parseInt(hskLevel.replace(/[^0-9]/g, ''), 10);
  return n >= 4 ? 'zh' : 'ko';
}

function buildAssignmentGenerationPrompt({
  lessonTitle,
  lessonContext,
  hskLevel,
  targetAudience,
  type,
}: {
  lessonTitle: string;
  lessonContext: string;
  hskLevel: string;
  targetAudience: string;
  type: string;
}): string {
  const typeLabel = type === 'speaking' ? '말하기 과제' : '작문 과제';
  const lang = getInstructionLanguage(hskLevel);
  const patterns = HSK_GRAMMAR_PATTERNS[hskLevel] ?? HSK_GRAMMAR_PATTERNS['HSK3'];
  const lengthGuide = HSK_LENGTH_GUIDE[hskLevel] ?? HSK_LENGTH_GUIDE['HSK3'];
  const patternList = patterns.join(' / ');

  const promptFormatGuide = lang === 'zh'
    ? `지시문 작성 규칙 (이 규칙은 JSON 응답에 포함하지 마세요):
- 지시문은 중국어로만 작성합니다 (학생이 중국어 환경에 익숙해지도록).
- 구조: ① 과제 목적 한 줄 (请用中文写…) → ② 포함할 내용 항목 (内容包括：…) → ③ 사용 문형 요구 (请使用下面的表达中至少1个：…)
- 분량: ${lengthGuide}
- 요구 문형 후보 (1~2개 선택): ${patternList}`
    : `지시문 작성 규칙 (이 규칙은 JSON 응답에 포함하지 마세요):
- 지시문은 한국어로 작성하되 요구 문형은 중국어로 표기합니다.
- 구조: ① 과제 목적 한 줄 → ② 포함할 내용 항목 (글머리 기호 목록) → ③ 사용해야 할 문형 (중국어 표기)
- 분량: ${lengthGuide}
- 요구 문형 후보 (1~2개 선택): ${patternList}`;

  return `당신은 중국어 교육 전문가입니다. 아래 수업 정보를 바탕으로 ${hskLevel} 수준에 적합한 ${typeLabel}를 생성해 주세요.

[수업 정보]
- 수업명: ${lessonTitle}
- 수업 내용 요약: ${lessonContext}
- HSK 수준: ${hskLevel}
- 평가 대상: ${targetAudience}

[${promptFormatGuide}]

[출력 형식]
- title: 수업 주제와 관련된 간결한 과제명 (한국어, 15자 이내)
- prompt: 학생에게 그대로 보여줄 완성된 지시문

예시 (HSK4 수준):
{
  "title": "자기소개 작문",
  "prompt": "请用中文写4~5句话介绍自己。\n内容包括：姓名、年龄、出身、爱好、喜欢的晚餐和理由。\n请使用下面的表达中至少1个：\n因为……所以…… / 虽然……但是…… / 不仅……还…… / 对……来说"
}

반드시 아래 JSON 형식으로만 응답하세요. 설명 없이 JSON만 출력하세요:
{"title": "과제 제목", "prompt": "과제 지시문"}`;
}

export async function POST(request: Request) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  let body: GenerateAssignmentBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.assignmentId) {
    return NextResponse.json({ error: '`assignmentId` is required' }, { status: 400 });
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: body.assignmentId },
    include: {
      lesson: {
        include: {
          course: { select: { userId: true, title: true } },
          blocks: { select: { type: true, content: true }, orderBy: { order: 'asc' } },
        },
      },
    },
  });

  if (!assignment || assignment.lesson.course.userId !== userId) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  const hskLevel = body.hskLevel?.trim() || assignment.hskLevel || 'HSK3';
  const targetAudience = body.targetAudience?.trim() || assignment.targetAudience || '중국어 학습자';
  const type = body.type || assignment.type;

  // Extract meaningful text from lesson blocks for context
  const contextParts: string[] = [];
  for (const block of assignment.lesson.blocks) {
    try {
      const content = typeof block.content === 'string' ? JSON.parse(block.content) : block.content;
      if (block.type === 'heading' && content?.text) {
        contextParts.push(`[주제] ${content.text}`);
      } else if (block.type === 'text' && content?.text) {
        const trimmed = String(content.text).slice(0, 200);
        contextParts.push(trimmed);
      } else if (block.type === 'quiz' && content?.question) {
        contextParts.push(`[학습 활동] ${content.question}`);
      }
    } catch {
      // skip malformed blocks
    }
  }

  const lessonContext = contextParts.length > 0
    ? contextParts.slice(0, 6).join(' / ')
    : `${assignment.lesson.course.title} 과정의 수업`;

  const prompt = buildAssignmentGenerationPrompt({
    lessonTitle: assignment.lesson.title,
    lessonContext,
    hskLevel,
    targetAudience,
    type,
  });

  try {
    const raw = await generateAiText({ prompt, userId, timeoutMs: rubricAiTimeoutMs });
    const parsed = JSON.parse(cleanAiJsonResponse(raw));
    if (!parsed.title || !parsed.prompt) {
      return NextResponse.json({ error: 'AI가 유효한 응답을 생성하지 못했습니다.' }, { status: 500 });
    }
    return NextResponse.json({ title: String(parsed.title), prompt: String(parsed.prompt) });
  } catch (e) {
    console.error('Assignment auto-generate failed:', getAiErrorMessage(e));
    return NextResponse.json({ error: '과제 자동 생성에 실패했습니다. 다시 시도해 주세요.' }, { status: 500 });
  }
}
