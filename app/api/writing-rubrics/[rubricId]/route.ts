import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

/**
 * GET /api/writing-rubrics/[rubricId]
 *
 * Returns the rubric with criteria and deductionPolicy parsed from their
 * JSON-string storage form. 404 if the rubric isn't owned by the current user.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ rubricId: string }> },
) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { rubricId } = await params;

  const rubric = await prisma.writingRubric.findUnique({ where: { id: rubricId } });
  if (!rubric || rubric.ownerId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    rubric: {
      ...rubric,
      criteria: safeParse(rubric.criteria),
      deductionPolicy: safeParse(rubric.deductionPolicy),
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
