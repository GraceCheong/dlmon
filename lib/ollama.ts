/**
 * Ollama client for 課意studio / KeYi Studio
 * Uses local Ollama instance at http://localhost:11434
 * Primary models: qwen3:latest (fast), qwen3:30b (quality)
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

export const MODELS = {
  fast: 'qwen3:latest',      // 8B — real-time features, HSK analysis
  quality: 'qwen3:30b',     // 30B — curriculum generation, syllabus
  vision: 'llava:latest',    // multimodal
} as const;

export type OllamaModel = typeof MODELS[keyof typeof MODELS];

interface OllamaGenerateOptions {
  model: string;
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  images?: string[]; // Base64 encoded data
  timeoutMs?: number;
}

interface OllamaResponse {
  response: string;
  done: boolean;
  model: string;
  total_duration?: number;
}

/**
 * Strip <think>...</think> blocks emitted by qwen3 models before the actual answer.
 */
export function stripThinkingTokens(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

/**
 * Core Ollama generate call (non-streaming).
 * Automatically strips thinking tokens from qwen3 output.
 */
export async function ollamaGenerate(options: OllamaGenerateOptions): Promise<string> {
  const payload: Record<string, unknown> = {
    model: options.model,
    prompt: options.prompt,
    stream: false,
    options: {
      temperature: options.temperature ?? 0.7,
      ...(options.maxTokens ? { num_predict: options.maxTokens } : {}),
    },
  };

  if (options.system) {
    payload.system = options.system;
  }

  if (options.jsonMode) {
    payload.format = 'json';
  }

  if (options.images) {
    payload.images = options.images;
  }

  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(options.timeoutMs ?? 300_000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Ollama error ${response.status}: ${err}`);
  }

  const data: OllamaResponse = await response.json();
  return stripThinkingTokens(data.response);
}

/**
 * Streaming Ollama generate — yields text chunks.
 */
export async function* ollamaStream(options: OllamaGenerateOptions): AsyncGenerator<string> {
  const payload: Record<string, unknown> = {
    model: options.model,
    prompt: options.prompt,
    stream: true,
    options: {
      temperature: options.temperature ?? 0.7,
    },
  };

  if (options.system) payload.system = options.system;

  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(options.timeoutMs ?? 300_000),
  });

  if (!response.ok) throw new Error(`Ollama stream error ${response.status}`);

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const chunk: OllamaResponse = JSON.parse(line);
        if (chunk.response) {
          yield chunk.response;
        }
      } catch { /* skip malformed */ }
    }
  }
}

/**
 * Check if Ollama is available and list installed models.
 */
export async function checkOllamaStatus(): Promise<{ available: boolean; models: string[] }> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return { available: false, models: [] };
    const data = await response.json();
    const models = (data.models as Array<{ name: string }>).map((m) => m.name);
    return { available: true, models };
  } catch {
    return { available: false, models: [] };
  }
}

/**
 * Parse JSON from Ollama response, with fallback extraction if the model
 * wraps the JSON in markdown code blocks.
 */
export function parseOllamaJSON<T>(text: string): T {
  // Strip markdown code fences if present
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Try direct parse
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to extract first {...} or [...] block
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      return JSON.parse(match[1]) as T;
    }
    throw new Error(`Failed to parse Ollama JSON response: ${text.substring(0, 200)}`);
  }
}
