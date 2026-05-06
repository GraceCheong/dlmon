import { exec } from 'child_process';
import { promisify } from 'util';
import type { YouTubeMetadata } from './types';

const execAsync = promisify(exec);

const YT_PATTERNS = [
  /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
];

export function extractVideoId(url: string): string | null {
  for (const pattern of YT_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function isYouTubeUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}

export async function fetchYouTubeMetadata(url: string): Promise<YouTubeMetadata> {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error('유효한 YouTube URL이 아닙니다.');

  const originalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  // Use yt-dlp --dump-json to get metadata without downloading
  let title: string | undefined;
  let channelName: string | undefined;
  let durationSeconds: number | undefined;

  try {
    const cmd = `yt-dlp --dump-json --no-playlist --skip-download "${originalUrl}"`;
    const { stdout } = await execAsync(cmd, { timeout: 30_000 });
    const info = JSON.parse(stdout.trim());
    title = info.title ?? undefined;
    channelName = info.uploader ?? info.channel ?? undefined;
    durationSeconds = typeof info.duration === 'number' ? info.duration : undefined;
  } catch {
    // yt-dlp may not be installed or the video may be private/restricted.
    // Fall back to oEmbed for at least the title.
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(originalUrl)}&format=json`;
      const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(10_000) });
      if (res.ok) {
        const data = await res.json() as Record<string, unknown>;
        title = typeof data.title === 'string' ? data.title : undefined;
        channelName = typeof data.author_name === 'string' ? data.author_name : undefined;
      }
    } catch { /* best-effort */ }
  }

  return { videoId, originalUrl, title, channelName, durationSeconds, thumbnailUrl };
}
