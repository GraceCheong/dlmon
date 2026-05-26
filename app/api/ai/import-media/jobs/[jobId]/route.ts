import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';
import type { JobStatusResponse } from '@/lib/import-media/types';

export const runtime = 'nodejs';

/**
 * GET /api/ai/import-media/jobs/:jobId
 *
 * Returns job status, progress, metadata, transcript info, AI result, and error.
 *
 * IMPORTANT: audioStoragePath is intentionally excluded from the response — it is
 * an internal server-side path and must never be exposed to clients.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const { jobId } = await params;

  const job = await prisma.mediaImportJob.findUnique({ where: { id: jobId } });

  if (!job || job.userId !== userId) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  // Parse JSON fields; ignore parse errors gracefully
  let aiResult = undefined;
  if (job.aiResult) {
    try { aiResult = JSON.parse(job.aiResult); } catch { /* ignore */ }
  }

  const response: JobStatusResponse = {
    importJobId: job.id,
    status: job.status as JobStatusResponse['status'],
    // source
    sourceUrl: job.sourceUrl,
    videoId: job.videoId ?? undefined,
    videoTitle: job.videoTitle ?? undefined,
    channelName: job.channelName ?? undefined,
    durationSeconds: job.durationSeconds ?? undefined,
    thumbnailUrl: job.thumbnailUrl ?? undefined,
    // transcript
    transcriptText: job.transcriptText ?? undefined,
    transcriptSource: (job.transcriptSource as JobStatusResponse['transcriptSource']) ?? undefined,
    transcriptStatus: (job.transcriptStatus as JobStatusResponse['transcriptStatus']) ?? undefined,
    // audio — paths omitted by design
    audioStatus: (job.audioStatus as JobStatusResponse['audioStatus']) ?? undefined,
    audioDeletedAt: job.audioDeletedAt?.toISOString() ?? undefined,
    // STT
    sttProvider: job.sttProvider ?? undefined,
    sttModel: job.sttModel ?? undefined,
    // AI
    aiResult,
    // error
    error: job.jobError ?? undefined,
    errorCode: job.errorCode ?? undefined,
    // timing
    completedAt: job.completedAt?.toISOString() ?? undefined,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };

  return NextResponse.json(response);
}
