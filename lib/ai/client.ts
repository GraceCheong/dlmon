import { createOpenAI } from '@ai-sdk/openai';

const localUrl = process.env.LOCAL_LLM_URL || 'http://localhost:11434/v1';

export const aiClient = createOpenAI({
  baseURL: localUrl,
  apiKey: process.env.OPENAI_API_KEY || 'local-dummy-key',
});

// deepseek-r1:8b for local — fast, Chinese-capable, fits in consumer VRAM.
export const defaultModel = process.env.LOCAL_LLM_MODEL || 'deepseek-r1:8b';

function readTimeoutMs(name: string, fallbackMs: number): number {
  const raw = process.env[name];
  if (!raw) return fallbackMs;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1_000) return fallbackMs;
  return Math.min(parsed, 300_000);
}

export const writingAiTimeoutMs = readTimeoutMs('WRITING_AI_TIMEOUT_MS', 120_000);
export const rubricAiTimeoutMs = readTimeoutMs('RUBRIC_AI_TIMEOUT_MS', 30_000);

export function isAiTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const text = `${error.name} ${error.message}`.toLowerCase();
  const killed = (error as { killed?: boolean }).killed === true;
  return (
    killed ||
    text.includes('timeout') ||
    text.includes('timed out') ||
    text.includes('abort')
  );
}

export function getAiErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function cleanAiJsonResponse(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
}
