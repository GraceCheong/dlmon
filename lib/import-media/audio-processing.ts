import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { AUDIO_CHUNK_SECONDS } from './constants';
import type { AudioProcessResult } from './types';

const execAsync = promisify(exec);

/**
 * Normalize audio to 16 kHz mono WAV (required by Whisper).
 * Then split into fixed-length chunks so large files can be transcribed
 * incrementally without hitting memory limits.
 *
 * All generated paths are returned so the caller can register them with
 * AudioCleanupService.
 */
export async function processAudio(
  sourcePath: string,
  jobId: string,
): Promise<AudioProcessResult> {
  const jobDir = path.dirname(sourcePath);
  const normalizedPath = path.join(jobDir, 'normalized.wav');

  // Step 1 — normalize: mono, 16 kHz, WAV
  const normalizeCmd = `ffmpeg -y -i "${sourcePath}" -ac 1 -ar 16000 "${normalizedPath}"`;
  console.log(`[audio-processing] normalize cmd: ${normalizeCmd}`);
  try {
    const { stderr } = await execAsync(normalizeCmd, { timeout: 10 * 60_000 });
    if (stderr) console.log(`[audio-processing] ffmpeg normalize stderr: ${stderr.slice(0, 300)}`);
  } catch (err) {
    console.error(`[audio-processing] ffmpeg normalize failed:`, err instanceof Error ? err.message : String(err));
    throw new Error(
      `오디오 정규화 실패. ffmpeg 설치 여부를 확인하세요: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const normalizedStat = fs.statSync(normalizedPath);
  console.log(`[audio-processing] normalized: ${normalizedPath} (${normalizedStat.size}B)`);

  // Step 2 — chunk: split into segments of AUDIO_CHUNK_SECONDS each
  const chunkPattern = path.join(jobDir, 'chunk_%03d.wav');
  const chunkCmd = [
    'ffmpeg',
    `-i "${normalizedPath}"`,
    '-f segment',
    `-segment_time ${AUDIO_CHUNK_SECONDS}`,
    '-c copy',
    `"${chunkPattern}"`,
  ].join(' ');

  console.log(`[audio-processing] chunk cmd: ${chunkCmd}`);
  try {
    const { stderr } = await execAsync(chunkCmd, { timeout: 10 * 60_000 });
    if (stderr) console.log(`[audio-processing] ffmpeg chunk stderr: ${stderr.slice(0, 300)}`);
  } catch (err) {
    console.error(`[audio-processing] ffmpeg chunk failed:`, err instanceof Error ? err.message : String(err));
    throw new Error(
      `오디오 청크 분할 실패: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Collect chunk paths in index order
  const chunkPaths = fs
    .readdirSync(jobDir)
    .filter(f => /^chunk_\d{3}\.wav$/.test(f))
    .sort()
    .map(f => path.join(jobDir, f));

  if (!chunkPaths.length) {
    // No chunks created — may happen for very short audio; use the normalized file directly
    console.log(`[audio-processing] No chunk files found — using normalized file directly`);
    chunkPaths.push(normalizedPath);
  }

  console.log(`[audio-processing] chunks: ${chunkPaths.map(p => path.basename(p)).join(', ')}`);
  return { normalizedPath, chunkPaths, jobDir };
}
