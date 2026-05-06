import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

/**
 * GET /api/writing-evaluations/[evaluationId]
 *
 * Returns the evaluation with all JSON-string fields parsed.
 */
export async function GET(
  _request: Request,
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

  return NextResponse.json({
    evaluation: {
      ...evaluation,
      rubricSnapshot: safeParse(evaluation.rubricSnapshot),
      deductions: safeParse(evaluation.deductions),
      sentenceFeedback: safeParse(evaluation.sentenceFeedback),
    },
  });
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
