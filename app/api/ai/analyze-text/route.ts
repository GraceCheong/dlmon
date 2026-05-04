import { NextResponse } from 'next/server';
import { ollamaGenerate, parseOllamaJSON, MODELS } from '@/lib/ollama';
import { segmentAndAnalyze } from '@/lib/cedict';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Step 1: Local dictionary-based segmentation (fast, no LLM needed for common words)
    const localTokens = segmentAndAnalyze(text);
    
    // Step 2: For tokens missing pinyin, use Ollama to fill gaps
    const missingPinyin = localTokens
      .filter(t => /[\u4e00-\u9fa5]/.test(t.text) && !t.pinyin)
      .map(t => t.text);

    let ollamaPinyinMap: Record<string, { pinyin: string; hskLevel: number | null }> = {};

    if (missingPinyin.length > 0) {
      try {
        const uniqueMissing = [...new Set(missingPinyin)];
        const prompt = `You are a Chinese language expert. For each Chinese word/character below, provide the pinyin with tone marks and its HSK level (1-6, or null if not in HSK). Respond ONLY with valid JSON, no explanation.

Words: ${uniqueMissing.join('、')}

Response format (example):
{"爸爸": {"pinyin": "bàba", "hsk": 1}, "漂亮": {"pinyin": "piàoliang", "hsk": 2}, "稀饭": {"pinyin": "xīfàn", "hsk": null}}

Respond with JSON only:`;

        const ollamaResponse = await ollamaGenerate({
          model: MODELS.fast,
          prompt,
          temperature: 0.1,
          maxTokens: 1000,
          jsonMode: true,
        });

        const parsed = parseOllamaJSON<Record<string, { pinyin: string; hsk: number | null }>>(ollamaResponse);
        for (const [word, data] of Object.entries(parsed)) {
          ollamaPinyinMap[word] = { pinyin: data.pinyin, hskLevel: data.hsk };
        }
      } catch (e) {
        console.warn('Ollama pinyin lookup failed, using local data only:', e);
      }
    }

    // Step 3: Merge Ollama results into tokens
    const finalTokens = localTokens.map(token => {
      if (/[\u4e00-\u9fa5]/.test(token.text) && !token.pinyin) {
        const ollamaData = ollamaPinyinMap[token.text];
        if (ollamaData) {
          return {
            ...token,
            pinyin: ollamaData.pinyin,
            hskLevel: ollamaData.hskLevel,
          };
        }
      }
      return token;
    });

    return NextResponse.json({ tokens: finalTokens });
  } catch (error) {
    console.error('Text Analysis Error:', error);
    return NextResponse.json({ error: 'Failed to analyze text' }, { status: 500 });
  }
}
