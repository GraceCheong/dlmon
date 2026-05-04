import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;
  
  try {
    const { blocks } = await request.json();

    // Transactions ensure data integrity
    await prisma.$transaction(async (tx) => {
      // 1. Delete all existing blocks for this lesson
      await tx.lessonBlock.deleteMany({
        where: { lessonId }
      });

      // 2. Create new blocks with the updated order and content
      if (blocks && blocks.length > 0) {
        await tx.lessonBlock.createMany({
          data: blocks.map((b: any, index: number) => ({
            id: b.id,
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
