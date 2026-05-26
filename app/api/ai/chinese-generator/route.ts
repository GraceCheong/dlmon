import { NextResponse } from 'next/server';
import { cleanAiJsonResponse, isAiTimeoutError, writingAiTimeoutMs } from '@/lib/ai/client';
import { generateAiText } from '@/lib/ai/generate';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';
import { buildChineseGeneratorPrompt } from '@/lib/chinese-generator';

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

  const { mode, topic, hskLevel, targetAudience, count, grammarPattern, context } = body;

  if (!mode || (mode !== 'vocabulary' && mode !== 'sentence')) {
    return NextResponse.json({ error: '`mode` must be "vocabulary" or "sentence"' }, { status: 400 });
  }
  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return NextResponse.json({ error: '`topic` is required' }, { status: 400 });
  }
  if (!hskLevel || typeof hskLevel !== 'string') {
    return NextResponse.json({ error: '`hskLevel` is required' }, { status: 400 });
  }

  const itemCount = typeof count === 'number' ? Math.min(Math.max(1, count), 30) : 10;

  const prompt = buildChineseGeneratorPrompt({
    mode: mode as 'vocabulary' | 'sentence',
    topic: String(topic).trim(),
    hskLevel: String(hskLevel),
    targetAudience: typeof targetAudience === 'string' ? targetAudience : '',
    count: itemCount,
    grammarPattern: typeof grammarPattern === 'string' ? grammarPattern : undefined,
    context: typeof context === 'string' ? context : undefined,
  });

  try {
    const text = await generateAiText({ prompt, userId, timeoutMs: writingAiTimeoutMs });
    let items: unknown[];
    try {
      items = JSON.parse(cleanAiJsonResponse(text));
      if (!Array.isArray(items)) throw new Error('Not an array');
    } catch {
      return NextResponse.json({ error: 'AI returned invalid format', raw: text }, { status: 502 });
    }

    return NextResponse.json({
      mode,
      topic: String(topic).trim(),
      hskLevel,
      targetAudience: targetAudience || '',
      count: itemCount,
      items,
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
