import type { YouTubeMetadata } from './types';
import { execYtDlp } from './yt-dlp';
import { parseYouTubeUrl } from '@/lib/youtube-url';

export { isYouTubeUrl, extractVideoId } from '@/lib/youtube-url';

export async function fetchYouTubeMetadata(url: string): Promise<YouTubeMetadata> {
  const parsed = parseYouTubeUrl(url);
  if (!parsed) throw new Error('유효한 YouTube URL이 아닙니다. 일반 YouTube 링크, Shorts, youtu.be 링크를 지원합니다.');

  const { videoId, canonicalUrl: originalUrl } = parsed;
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  // Use yt-dlp --dump-json to get metadata without downloading
  let title: string | undefined;
  let channelName: string | undefined;
  let durationSeconds: number | undefined;

  try {
    const { stdout } = await execYtDlp(['--dump-json', '--no-playlist', '--skip-download', parsed.canonicalUrl], {
      timeout: 30_000,
    });
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
