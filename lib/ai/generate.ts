import { generateText } from 'ai';
import { execFile } from 'child_process';
import { promisify } from 'util';
import prisma from '@/lib/prisma';
import { aiClient, defaultModel, writingAiTimeoutMs } from './client';

const execFileAsync = promisify(execFile);

async function getUserProvider(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiProvider: true },
  });
  return user?.aiProvider ?? 'ollama';
}

async function runClaudeCli(prompt: string, timeoutMs: number): Promise<string> {
  const { stdout } = await execFileAsync(
    'claude',
    ['--print', prompt],
    {
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
      // Suppress colour codes and interactive prompts
      env: { ...process.env, NO_COLOR: '1', TERM: 'dumb' },
    },
  );
  return stdout.trim();
}

/**
 * Unified AI text generation. Dispatches to Ollama or Claude CLI based on the
 * user's saved `aiProvider` setting ("ollama" | "claude-cli").
 */
export async function generateAiText({
  prompt,
  userId,
  timeoutMs = writingAiTimeoutMs,
}: {
  prompt: string;
  userId: string;
  timeoutMs?: number;
}): Promise<string> {
  const provider = await getUserProvider(userId);

  if (provider === 'claude-cli') {
    return runClaudeCli(prompt, timeoutMs);
  }

  // Default: local Ollama via Vercel AI SDK OpenAI-compatible endpoint
  const { text } = await generateText({
    model: aiClient(defaultModel),
    prompt,
    maxRetries: 0,
    timeout: timeoutMs,
  });
  return text;
}
