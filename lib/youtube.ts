/**
 * YouTube audio download utility using yt-dlp (python module)
 * Falls back to direct yt-dlp command if available in PATH
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import fs from 'fs';

const execAsync = promisify(exec);

import { isYouTubeUrl } from '@/lib/youtube-url';
export { isYouTubeUrl };

export function isVideoUrl(url: string): boolean {
  return isYouTubeUrl(url) || /(?:douyin\.com|bilibili\.com|tiktok\.com)/.test(url);
}

/**
 * Download audio from a YouTube URL using yt-dlp.
 * Returns the path to the downloaded audio file.
 */
export async function downloadYouTubeAudio(url: string): Promise<string> {
  const tmpDir = os.tmpdir();
  const outTemplate = path.join(tmpDir, `keyi-audio-${Date.now()}.%(ext)s`);

  // Try python -m yt_dlp first (user install), then yt-dlp directly
  const commands = [
    `python -m yt_dlp -x --audio-format mp3 --audio-quality 3 -o "${outTemplate}" --no-playlist "${url}"`,
    `yt-dlp -x --audio-format mp3 --audio-quality 3 -o "${outTemplate}" --no-playlist "${url}"`,
  ];

  let lastError: Error | null = null;
  for (const cmd of commands) {
    try {
      await execAsync(cmd, { timeout: 120_000 });
      // Find the most recent mp3
      const mp3Files = fs.readdirSync(tmpDir)
        .filter(f => f.startsWith('keyi-audio-') && (f.endsWith('.mp3') || f.endsWith('.m4a') || f.endsWith('.webm')))
        .map(f => ({ name: f, time: fs.statSync(path.join(tmpDir, f)).mtimeMs }))
        .sort((a, b) => b.time - a.time);

      if (mp3Files.length > 0) {
        return path.join(tmpDir, mp3Files[0].name);
      }
      break;
    } catch (e) {
      lastError = e as Error;
    }
  }

  throw new Error(`Failed to download audio: ${lastError?.message || 'unknown error'}`);
}

/**
 * Get video title and metadata without downloading
 */
export async function getVideoMetadata(url: string): Promise<{ title: string; duration: number }> {
  const commands = [
    `python -m yt_dlp --print "%(title)s\t%(duration)s" --no-download "${url}"`,
    `yt-dlp --print "%(title)s\t%(duration)s" --no-download "${url}"`,
  ];

  for (const cmd of commands) {
    try {
      const { stdout } = await execAsync(cmd, { timeout: 30_000 });
      const parts = stdout.trim().split('\t');
      return {
        title: parts[0] || 'Unknown Video',
        duration: parseInt(parts[1] || '0', 10),
      };
    } catch { /* try next */ }
  }

  return { title: 'Video', duration: 0 };
}
