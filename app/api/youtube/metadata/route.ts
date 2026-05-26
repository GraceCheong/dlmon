import { NextResponse } from 'next/server';
import { parseYouTubeUrl } from '@/lib/youtube-url';

/**
 * POST /api/youtube/metadata
 *
 * Returns thumbnail, title, and videoId for a YouTube URL — enough data to
 * render a YouTubeLinkBlock card in the lesson editor and in the exported PDF.
 *
 * Supported URL forms:
 *   https://www.youtube.com/watch?v=VIDEO_ID
 *   https://youtu.be/VIDEO_ID
 *   https://www.youtube.com/shorts/VIDEO_ID
 *
 * Title is fetched via YouTube's oEmbed endpoint (no API key required).
 * Thumbnail is derived from the videoId — no network call needed.
 * If the title fetch fails, isTitleAvailable is false so the frontend
 * can offer a manual title input field.
 */
export async function POST(request: Request) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const raw = body.url?.trim();
  if (!raw) {
    return NextResponse.json({ error: '`url` is required' }, { status: 400 });
  }

  const parsed = parseYouTubeUrl(raw);
  if (!parsed) {
    return NextResponse.json({ error: '유효한 YouTube URL이 아닙니다.' }, { status: 400 });
  }

  // Normalise to canonical watch URL for oEmbed + return value.
  const { videoId, canonicalUrl: originalUrl } = parsed;

  // Thumbnail — always derivable from videoId; no network call needed.
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  // Title via YouTube oEmbed (no API key, rate-limited at ~1000 req/day but fine for MVP).
  let title: string | undefined;
  let isTitleAvailable = false;
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(originalUrl)}&format=json`;
    const res = await fetch(oembedUrl, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.title === 'string' && data.title) {
        title = data.title;
        isTitleAvailable = true;
      }
    }
  } catch {
    // Title fetch failed — isTitleAvailable stays false; frontend shows manual input.
  }

  return NextResponse.json({
    videoId,
    title,
    thumbnailUrl,
    originalUrl,
    isThumbnailAvailable: true,
    isTitleAvailable,
  });
}
