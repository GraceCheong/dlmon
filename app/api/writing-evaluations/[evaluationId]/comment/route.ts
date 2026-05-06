import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

/**
 * PATCH /api/writing-evaluations/[evaluationId]/comment
 *
 * Update the teacher's qualitative comment on an evaluation. Comments are
 * editable independently of the AI score so teachers can refine guidance
 * without re-running the model.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ evaluationId: string }> },
) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { evaluationId } = await params;

  const evaluation = await prisma.writingEvaluation.findUnique({
    where: { id: evaluationId },
  });
  if (!evaluation || evaluation.teacherId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: { teacherComment?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body.teacherComment !== 'string') {
    return NextResponse.json({ error: '`teacherComment` must be a string' }, { status: 400 });
  }

  const updated = await prisma.writingEvaluation.update({
    where: { id: evaluationId },
    data: { teacherComment: body.teacherComment.trim() || null },
  });

  return NextResponse.json({ evaluation: updated });
}
