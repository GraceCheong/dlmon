import { NextResponse } from 'next/server';
import { ollamaGenerate, parseOllamaJSON, MODELS } from '@/lib/ollama';

export async function POST(request: Request) {
  try {
    const { lessonTitle, topic, objectives, courseLevel, language = 'ko' } = await request.json();

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
    {"type": "tone-practice", "content": {"text": "중국어 핵심 문장 (5자 내외)", "pinyin": "병음 (띄어쓰기로 구분)"}},
    {"type": "text", "content": {"text": "문법 설명 및 예문 (한국어)"}},
    {"type": "char-analysis", "content": {"character": "핵심 한자 1개", "pinyin": "병음", "meaning": "의미", "strokes": 5, "radical": "부수", "examples": [{"word": "예시 단어", "pinyin": "병음", "meaning": "뜻"}]}},
    {"type": "quiz", "content": {"question": "이해 확인 질문", "options": ["선택지1", "선택지2", "선택지3", "선택지4"], "correct": 0}}
  ]
}`
      : `You are a Chinese language education expert. Generate lesson block content for the following lesson.

Title: ${lessonTitle}
Topic: ${topic}
Objectives: ${objectives}
Level: ${courseLevel}

Respond ONLY with valid JSON:
{
  "blocks": [
    {"type": "heading", "content": {"text": "Lesson Title", "level": 1}},
    {"type": "text", "content": {"text": "Introduction paragraph (2-3 sentences)"}},
    {"type": "tone-practice", "content": {"text": "Key Chinese phrase", "pinyin": "pinyin with tones"}},
    {"type": "text", "content": {"text": "Grammar explanation with examples"}},
    {"type": "char-analysis", "content": {"character": "汉", "pinyin": "hàn", "meaning": "Chinese", "strokes": 5, "radical": "氵", "examples": [{"word": "汉语", "pinyin": "hànyǔ", "meaning": "Chinese language"}]}},
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
