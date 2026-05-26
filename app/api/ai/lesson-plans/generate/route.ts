import { NextResponse } from 'next/server';
import { cleanAiJsonResponse, isAiTimeoutError, writingAiTimeoutMs } from '@/lib/ai/client';
import { generateAiText } from '@/lib/ai/generate';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

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

  const { promptContent, targetAudience, hskLevel } = body;

  if (!promptContent || typeof promptContent !== 'string' || !promptContent.trim()) {
    return NextResponse.json({ error: '`promptContent` is required and must not be empty' }, { status: 400 });
  }
  if (!targetAudience || typeof targetAudience !== 'string') {
    return NextResponse.json({ error: '`targetAudience` is required' }, { status: 400 });
  }

  const prompt = `
당신은 중국어 교육 전문가이자 수업 설계 전문가입니다. 아래 요청에 따라 구조화된 수업 계획서를 작성해 주세요.

수업 요청:
${promptContent}

대상: ${targetAudience}
${hskLevel ? `HSK 수준: ${hskLevel}` : ''}

다음 JSON 형식으로만 응답하세요 (설명 없이):
{
  "title": "수업 제목",
  "objectives": ["학습 목표 1", "학습 목표 2", "학습 목표 3"],
  "duration": "수업 시간 (예: 50분)",
  "prerequisites": "선수 학습 요건",
  "sections": [
    {
      "title": "도입 활동",
      "duration": "10분",
      "activities": ["활동 설명"],
      "teacherNotes": "교사 유의사항"
    },
    {
      "title": "본 활동",
      "duration": "30분",
      "activities": ["활동 설명"],
      "teacherNotes": "교사 유의사항"
    },
    {
      "title": "마무리",
      "duration": "10분",
      "activities": ["활동 설명"],
      "teacherNotes": "교사 유의사항"
    }
  ],
  "materials": ["필요 자료 1", "필요 자료 2"],
  "assessment": "평가 방법",
  "homework": "과제 (선택)"
}
`.trim();

  try {
    const text = await generateAiText({ prompt, userId, timeoutMs: writingAiTimeoutMs });
    let plan: unknown;
    try {
      plan = JSON.parse(cleanAiJsonResponse(text));
    } catch {
      return NextResponse.json({ error: 'AI returned invalid format', raw: text }, { status: 502 });
    }

    return NextResponse.json({
      draft: plan,
      aiProvider: 'ai',
    });
  } catch (e) {
    if (isAiTimeoutError(e)) {
      return NextResponse.json(
        { error: 'AI generation timed out', detail: `LLM did not respond within ${writingAiTimeoutMs}ms.` },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: 'AI generation failed', detail: (e as Error).message },
      { status: 502 },
    );
  }
}
