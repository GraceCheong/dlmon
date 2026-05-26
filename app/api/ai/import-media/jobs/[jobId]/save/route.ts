import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';
import type { SaveJobRequest } from '@/lib/import-media/types';

export const runtime = 'nodejs';

const VALID_SAVE_AS = new Set(['lesson_material']);

/**
 * POST /api/ai/import-media/jobs/:jobId/save
 *
 * Persists the (optionally edited) AI result. The job must be in `completed`
 * status and owned by the current teacher.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const { jobId } = await params;

  const job = await prisma.mediaImportJob.findUnique({
    where: { id: jobId },
    include: { savedContent: true },
  });

  if (!job || job.userId !== userId) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }
  if (job.status !== 'completed') {
    return NextResponse.json({ error: '완료된 작업만 저장할 수 있습니다.' }, { status: 400 });
  }

  let body: SaveJobRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { saveAs, courseId, lessonId, lessonPlanId, materialId, editedResult } = body;

  if (!saveAs || !VALID_SAVE_AS.has(saveAs)) {
    return NextResponse.json(
      { error: '`saveAs` must be lesson_material. Other targets are not wired to a UI yet.' },
      { status: 400 },
    );
  }
  if (!editedResult || typeof editedResult !== 'object') {
    return NextResponse.json({ error: '`editedResult` is required' }, { status: 400 });
  }

  if (lessonPlanId || materialId) {
    return NextResponse.json(
      { error: '`lessonPlanId` and `materialId` are not supported for lesson_material saves' },
      { status: 400 },
    );
  }

  if (!lessonId || !courseId) {
    return NextResponse.json(
      { error: '`courseId` and `lessonId` are required for lesson_material saves' },
      { status: 400 },
    );
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: { select: { id: true, userId: true } } },
  });
  if (!lesson || lesson.course.userId !== userId || lesson.course.id !== courseId) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }

  // Upsert: if teacher saves the same job again (re-save after edits), update the row.
  const saved = await prisma.importedMediaContent.upsert({
    where: { jobId },
    create: {
      jobId,
      saveAs,
      courseId,
      lessonId,
      lessonPlanId: null,
      materialId: null,
      content: JSON.stringify(editedResult),
    },
    update: {
      saveAs,
      courseId,
      lessonId,
      lessonPlanId: null,
      materialId: null,
      content: JSON.stringify(editedResult),
      savedAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    savedContentId: saved.id,
    jobId,
    saveAs: saved.saveAs,
    savedAt: saved.savedAt.toISOString(),
  }, { status: 201 });
}
