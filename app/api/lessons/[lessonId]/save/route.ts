import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

interface LegacyBlock {
  id?: string;
  type: string;
  content: unknown;
}

/**
 * @deprecated since Phase 3 (2026-05-01). Use
 * `PATCH /api/lessons/[lessonId]/blocks` for new code; this route remains only
 * for backward compatibility with older callers.
 *
 * Kept temporarily for backward compatibility with any external/legacy callers.
 * Remove once nothing in the project (or the student portal) references it.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { lessonId } = await params;
  
  try {
    const { blocks } = await request.json();
    if (!Array.isArray(blocks)) {
      return NextResponse.json({ error: '`blocks` must be an array' }, { status: 400 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { course: { select: { userId: true } } },
    });
    if (!lesson || lesson.course.userId !== userId) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const incoming: LegacyBlock[] = [];
    for (const [index, raw] of blocks.entries()) {
      if (!raw || typeof raw !== 'object') {
        return NextResponse.json({ error: `Block at index ${index} is not an object` }, { status: 400 });
      }
      const block = raw as Record<string, unknown>;
      if (typeof block.type !== 'string' || !block.type) {
        return NextResponse.json({ error: `Block at index ${index} missing string \`type\`` }, { status: 400 });
      }
      incoming.push({
        id: typeof block.id === 'string' ? block.id : undefined,
        type: block.type,
        content: 'content' in block ? block.content : {},
      });
    }

    // Transactions ensure data integrity
    await prisma.$transaction(async (tx) => {
      // 1. Delete all existing blocks for this lesson
      await tx.lessonBlock.deleteMany({
        where: { lessonId }
      });

      // 2. Create new blocks with the updated order and content
      if (incoming.length > 0) {
        await tx.lessonBlock.createMany({
          data: incoming.map((b, index) => ({
            ...(b.id ? { id: b.id } : {}),
            lessonId,
            type: b.type,
            content: JSON.stringify(b.content),
            order: index
          }))
        });
      }

      // 3. Update the lesson status if needed
      await tx.lesson.update({
        where: { id: lessonId },
        data: {
          status: 'draft' // ensure it's still draft or keep current
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save lesson error:', error);
    return NextResponse.json(
      { error: 'Failed to save lesson' },
      { status: 500 }
    );
  }
}
