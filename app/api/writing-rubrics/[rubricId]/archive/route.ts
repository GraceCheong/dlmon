import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

/**
 * PATCH /api/writing-rubrics/[rubricId]/archive
 *
 * Marks a rubric as archived. Existing evaluations referencing it stay valid
 * (each one keeps its own rubricSnapshot); only future re-uses are blocked
 * by callers that filter on status='active'.
 *
 * Body (optional): `{ "active": true }` to un-archive instead.
 */
export async function PATCH(
  request: Request,
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

  let body: { active?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is allowed — defaults to archive.
  }
  const active = body.active === true;

  const updated = await prisma.writingRubric.update({
    where: { id: rubricId },
    data: { status: active ? 'active' : 'archived' },
  });

  return NextResponse.json({ rubric: updated });
}
