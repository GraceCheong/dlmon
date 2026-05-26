export type YouTubeUrlType = 'watch' | 'shorts' | 'youtu.be' | 'embed';

export interface ParsedYouTubeUrl {
  videoId: string;
  /** Always the canonical https://www.youtube.com/watch?v={id} form */
  canonicalUrl: string;
  urlType: YouTubeUrlType;
}

// Each pattern captures the 11-character video ID in group 1.
// Order matters: watch must come before embed to avoid false matches.
const PATTERNS: Array<[RegExp, YouTubeUrlType]> = [
  [/youtube\.com\/watch\?[^#\s]*v=([A-Za-z0-9_-]{11})/, 'watch'],
  [/youtu\.be\/([A-Za-z0-9_-]{11})/, 'youtu.be'],
  [/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/, 'shorts'],
  [/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/, 'embed'],
];

/**
 * Parse any supported YouTube URL format and extract the video ID.
 * Supports: watch?v=, youtu.be/, youtube.com/shorts/, youtube.com/embed/
 * Returns null when the URL is not a recognised YouTube video URL.
 */
export function parseYouTubeUrl(url: string): ParsedYouTubeUrl | null {
  if (!url) return null;
  for (const [pattern, urlType] of PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) {
      const videoId = match[1];
      return {
        videoId,
        canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
        urlType,
      };
    }
  }
  return null;
}

export function isYouTubeUrl(url: string): boolean {
  return parseYouTubeUrl(url) !== null;
}

export function extractVideoId(url: string): string | null {
  return parseYouTubeUrl(url)?.videoId ?? null;
}
