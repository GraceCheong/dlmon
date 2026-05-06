import { NextResponse } from 'next/server';
import { ollamaGenerate, parseOllamaJSON, MODELS } from '@/lib/ollama';

export async function POST(request: Request) {
  try {
    const { lessonTitle, topic, objectives, courseLevel, language = 'ko' } = await request.json();

    // Phase 3 cleanup: removed `tone-practice` and `char-analysis` from the
    // AI prompt template. Available block types are: heading, text, image,
    // video, quiz, text-analyzer, youtube-extract, youtube-link.
    const prompt = language === 'ko'
      ? `당신은 중국어 교육 전문가입니다. 아래 수업 정보를 바탕으로 수업 블록 콘텐츠를 생성해 주세요.

수업 제목: ${lessonTitle}
주제: ${topic}
학습 목표: ${objectives}
수준: ${courseLevel}

다음 JSON 형식으로만 응답하세요. 각 블록은 수업 자료의 한 섹션입니다:
{
  "blocks": [
    {"type": "heading", "content": {"text": "수업 제목", "level": 1}},
    {"type": "text", "content": {"text": "도입 설명 (2-3문장, 한국어)"}},
    {"type": "text-analyzer", "content": {"rawText": "이번 차시 중국어 핵심 본문 (3~6문장)"}},
    {"type": "text", "content": {"text": "문법 설명 및 예문 (한국어)"}},
    {"type": "quiz", "content": {"question": "이해 확인 질문", "options": ["선택지1", "선택지2", "선택지3", "선택지4"], "correct": 0}}
  ]
}`
      : `You are a Chinese language education expert. Generate lesson block content for the following lesson.

Title: ${lessonTitle}
Topic: ${topic}
Objectives: ${objectives}
Level: ${courseLevel}

Available block types: heading, text, image, video, quiz, text-analyzer, youtube-extract, youtube-link.
Respond ONLY with valid JSON:
{
  "blocks": [
    {"type": "heading", "content": {"text": "Lesson Title", "level": 1}},
    {"type": "text", "content": {"text": "Introduction paragraph (2-3 sentences)"}},
    {"type": "text-analyzer", "content": {"rawText": "Core Chinese passage for this lesson (3-6 sentences)"}},
    {"type": "text", "content": {"text": "Grammar explanation with examples"}},
    {"type": "quiz", "content": {"question": "Comprehension check question", "options": ["A", "B", "C", "D"], "correct": 0}}
  ]
}`;

    const result = await ollamaGenerate({
      model: MODELS.fast,
      prompt,
      temperature: 0.8,
      jsonMode: true,
    });

    const parsed = parseOllamaJSON<{ blocks: unknown[] }>(result);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Lesson generation error:', error);
    return NextResponse.json({ error: 'Failed to generate lesson content' }, { status: 500 });
  }
}
