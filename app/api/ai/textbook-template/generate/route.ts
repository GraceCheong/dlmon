import { NextResponse } from 'next/server';
import { cleanAiJsonResponse, isAiTimeoutError, writingAiTimeoutMs } from '@/lib/ai/client';
import { generateAiText } from '@/lib/ai/generate';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    textbookTitle,
    unitTitle,
    unitTopics,
    grammarPoints,
    vocabulary,
    hskLevel,
    targetAudience,
    lessonCount,
    saveAsTemplate,
  } = body;

  if (!textbookTitle || typeof textbookTitle !== 'string' || !textbookTitle.trim()) {
    return NextResponse.json({ error: '`textbookTitle` is required' }, { status: 400 });
  }
  if (!unitTitle || typeof unitTitle !== 'string' || !unitTitle.trim()) {
    return NextResponse.json({ error: '`unitTitle` is required' }, { status: 400 });
  }
  if (!targetAudience || typeof targetAudience !== 'string') {
    return NextResponse.json({ error: '`targetAudience` is required' }, { status: 400 });
  }

  const count = typeof lessonCount === 'number' ? Math.min(Math.max(lessonCount, 1), 8) : 3;

  const audienceMap: Record<string, string> = {
    middle_school: '중학생',
    high_school: '고등학생',
    university: '대학생',
    adult: '성인 일반',
    travel: '여행 목적 학습자',
    business: '비즈니스 목적 학습자',
  };
  const audienceLabel = audienceMap[targetAudience as string] ?? targetAudience;

  const prompt = `
당신은 중국어 교육 전문가이자 수업 설계 전문가입니다.
주어진 교재 정보를 바탕으로 실제 수업에 활용 가능한 수업 템플릿을 JSON으로 작성해 주세요.

[교재 정보]
- 교재명: ${textbookTitle}
- 단원/챕터: ${unitTitle}
${hskLevel ? `- HSK 수준: ${hskLevel}` : ''}
${unitTopics ? `- 주요 주제: ${unitTopics}` : ''}
${grammarPoints ? `- 문법 포인트: ${grammarPoints}` : ''}
${vocabulary ? `- 핵심 어휘: ${vocabulary}` : ''}

[수업 대상]
- 대상: ${audienceLabel}

[요구사항]
- 총 ${count}개의 수업 섹션(단계)을 구성해 주세요.
- 각 섹션은 도입 → 본 활동 → 심화/마무리 흐름을 따르거나, 교재 단원 특성에 맞게 재구성하세요.
- 활동은 구체적이고 실행 가능해야 합니다.
- 수업 자료와 평가 방법도 포함하세요.

다음 JSON 형식으로만 응답하세요 (마크다운 없이, 순수 JSON):
{
  "title": "수업 템플릿 제목 (교재명 + 단원명 반영)",
  "overview": "이 단원의 수업 개요 및 학습 목표 서술 (2~4문장)",
  "sections": [
    {
      "title": "섹션 제목 (예: 도입 및 동기부여)",
      "activities": ["구체적인 활동 1", "구체적인 활동 2"],
      "resources": ["필요 자료 1", "필요 자료 2"],
      "notes": "교사 유의사항 또는 팁"
    }
  ],
  "resources": ["단원 공통 자료 1", "단원 공통 자료 2"],
  "notes": "전체 수업 운영 시 참고 사항"
}
`.trim();

  let raw: string;
  try {
    raw = await generateAiText({ prompt, userId, timeoutMs: writingAiTimeoutMs });
  } catch (err) {
    if (isAiTimeoutError(err)) {
      return NextResponse.json({ error: 'AI 응답 시간이 초과되었습니다. 다시 시도해 주세요.', code: 'TIMEOUT' }, { status: 504 });
    }
    return NextResponse.json({ error: 'AI 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }

  let draft: { title?: string; overview?: string; sections?: unknown[]; resources?: unknown[]; notes?: string };
  try {
    draft = JSON.parse(cleanAiJsonResponse(raw));
  } catch {
    return NextResponse.json({ error: 'AI가 올바른 형식으로 응답하지 않았습니다.', raw }, { status: 502 });
  }

  const templateTitle = (typeof draft.title === 'string' && draft.title.trim())
    ? draft.title.trim()
    : `${textbookTitle} - ${unitTitle}`;

  // Optionally persist to Template table right away
  let templateId: string | null = null;
  if (saveAsTemplate === true) {
    const saved = await prisma.template.create({
      data: {
        userId,
        title: templateTitle,
        description: typeof draft.overview === 'string' ? draft.overview.slice(0, 300) : null,
        type: 'lesson',
        hskLevel: typeof hskLevel === 'string' ? hskLevel : null,
        targetAudience: typeof targetAudience === 'string' ? targetAudience : null,
        sourceType: 'ai',
        content: JSON.stringify({
          format: 'template_content_v1',
          overview: draft.overview ?? '',
          sections: Array.isArray(draft.sections) ? draft.sections : [],
          resources: Array.isArray(draft.resources) ? draft.resources : [],
          notes: draft.notes ?? '',
        }),
      },
    });
    templateId = saved.id;
  }

  return NextResponse.json({
    draft: {
      title: templateTitle,
      overview: draft.overview ?? '',
      sections: Array.isArray(draft.sections) ? draft.sections : [],
      resources: Array.isArray(draft.resources) ? draft.resources : [],
      notes: draft.notes ?? '',
    },
    templateId,
  });
}
