import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

interface IncomingBlock {
  id?: string;
  type: string;
  content: unknown;
  order: number;
}

/**
 * PATCH /api/lessons/[lessonId]/blocks
 *
 * Replace the lesson's block list and (optionally) status. Used by the lesson
 * material editor's "임시 저장" (Save Draft) button. Replaces the older
 * `POST /api/lessons/[lessonId]/save` route, which had no ownership check.
 *
 * Ownership chain enforced: Lesson → Course → User (current teacher).
 *
 * Request body:
 *   { blocks: Array<{ id?, type, content, order }>, status?: 'draft' | 'published' }
 *
 * Strategy: delete-all-then-recreate inside a single transaction. Simpler and
 * safer than per-row upsert when blocks can be added/removed/reordered.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { lessonId } = await params;

  // Ownership check: Lesson -> Course -> userId
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: { select: { userId: true } } },
  });
  if (!lesson || lesson.course.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: { blocks?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Array.isArray(body.blocks)) {
    return NextResponse.json({ error: '`blocks` must be an array' }, { status: 400 });
  }

  // Validate every block before any DB write.
  const incoming: IncomingBlock[] = [];
  for (const [i, raw] of body.blocks.entries()) {
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: `Block at index ${i} is not an object` }, { status: 400 });
    }
    const b = raw as Record<string, unknown>;
    if (typeof b.type !== 'string' || !b.type) {
      return NextResponse.json({ error: `Block at index ${i} missing string \`type\`` }, { status: 400 });
    }
    incoming.push({
      id: typeof b.id === 'string' ? b.id : undefined,
      type: b.type,
      content: 'content' in b ? b.content : {},
      order: typeof b.order === 'number' ? b.order : i,
    });
  }

  const newStatus =
    body.status === 'published' || body.status === 'draft' ? body.status : 'draft';

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.lessonBlock.deleteMany({ where: { lessonId } });

      if (incoming.length > 0) {
        // Recreate ordered, normalizing `order` to array index for consistency.
        // Let Prisma generate fresh CUIDs so we don't risk collisions with
        // ids from previous saves.
        await tx.lessonBlock.createMany({
          data: incoming.map((b, i) => ({
            lessonId,
            type: b.type,
            content: JSON.stringify(b.content ?? {}),
            order: i,
          })),
        });
      }

      const updatedLesson = await tx.lesson.update({
        where: { id: lessonId },
        data: { status: newStatus },
      });

      const blocks = await tx.lessonBlock.findMany({
        where: { lessonId },
        orderBy: { order: 'asc' },
      });

      return { updatedLesson, blocks };
    });

    return NextResponse.json({
      success: true,
      lessonId,
      status: result.updatedLesson.status,
      savedAt: result.updatedLesson.updatedAt.toISOString(),
      blocks: result.blocks.map((b) => ({
        id: b.id,
        type: b.type,
        content: JSON.parse(b.content as string),
        order: b.order,
      })),
    });
  } catch (error) {
    console.error('PATCH /api/lessons/[lessonId]/blocks error:', error);
    return NextResponse.json({ error: 'Failed to save lesson blocks' }, { status: 500 });
  }
}
