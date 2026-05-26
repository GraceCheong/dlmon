import fs from 'fs';
import path from 'path';
import { TEMP_BASE_DIR } from './constants';
import type { TranscriptFetchResult } from './types';
import { execYtDlp } from './yt-dlp';

/** Parse an SRT or VTT file into plain text, deduplicating adjacent identical lines. */
function parseSubtitleFile(content: string): string {
  const lines = content.split('\n');
  const textLines: string[] = [];
  let last = '';

  for (const raw of lines) {
    const line = raw.trim();
    // Skip sequence numbers, timestamps, and empty lines
    if (
      !line ||
      /^\d+$/.test(line) ||
      /^\d{2}:\d{2}:\d{2}[,.]/.test(line) ||
      /^WEBVTT/.test(line) ||
      /^NOTE\s/.test(line) ||
      /^-->/.test(line)
    ) continue;

    // Strip HTML/VTT tags and positioning directives
    const text = line
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\{[^}]+\}/g, '')
      .trim();

    if (text && text !== last) {
      textLines.push(text);
      last = text;
    }
  }

  return textLines.join(' ').replace(/\s{2,}/g, ' ').trim();
}

/** Preference order for subtitle language selection. */
const LANG_PRIORITY = ['zh-Hans', 'zh-Hant', 'zh', 'zh-CN', 'zh-TW', 'en'];

function pickBestSubtitleFile(dir: string): string | null {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.srt') || f.endsWith('.vtt'));
  if (!files.length) return null;

  for (const lang of LANG_PRIORITY) {
    const match = files.find(f => f.includes(`.${lang}.`) || f.includes(`[${lang}]`));
    if (match) return path.join(dir, match);
  }
  // Fall back to any subtitle file
  return path.join(dir, files[0]);
}

export async function fetchYouTubeTranscript(
  url: string,
  jobId: string,
): Promise<TranscriptFetchResult> {
  const captionDir = path.join(TEMP_BASE_DIR, jobId, 'captions');
  fs.mkdirSync(captionDir, { recursive: true });

  const outputTemplate = path.join(captionDir, 'caption');

  try {
    // Prefer manual subs; fall back to auto-generated. Convert to SRT for easy parsing.
    const args = [
      '--write-subs',
      '--write-auto-subs',
      '--sub-lang',
      'zh-Hans,zh-Hant,zh,en',
      '--skip-download',
      '--no-playlist',
      '--convert-subs',
      'srt',
      '-o',
      outputTemplate,
      url,
    ];

    await execYtDlp(args, { timeout: 60_000 });
  } catch {
    // yt-dlp may have returned a non-zero exit code when no subs exist — not fatal.
  }

  const subtitlePath = pickBestSubtitleFile(captionDir);
  if (!subtitlePath) {
    // Clean up empty dir
    try { fs.rmSync(captionDir, { recursive: true, force: true }); } catch { /* ignore */ }
    return { available: false, reason: 'YouTube 자막/스크립트를 찾을 수 없습니다.' };
  }

  try {
    const content = fs.readFileSync(subtitlePath, 'utf8');
    const text = parseSubtitleFile(content);

    // Clean up caption files — they've been parsed
    try { fs.rmSync(captionDir, { recursive: true, force: true }); } catch { /* ignore */ }

    if (!text.trim()) {
      return { available: false, reason: '자막 파일이 비어 있습니다.' };
    }

    return { available: true, text, source: 'youtube_auto' };
  } catch (err) {
    return {
      available: false,
      reason: `자막 파일 읽기 실패: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
