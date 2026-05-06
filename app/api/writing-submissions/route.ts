import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

interface CreateSubmissionBody {
  assignmentId?: string;
  memberId?: string;
  contentText?: string;
  rubricId?: string; // optional override; otherwise inherits from assignment.rubricId
}

/**
 * POST /api/writing-submissions
 *
 * Teacher-side submission creation. The teacher enters the student's writing
 * directly (per MVP scope — student portal expansion is "Later"). Returns the
 * persisted Submission. The submission is NOT auto-evaluated; the teacher
 * triggers /api/ai/writing-evaluations/evaluate when ready.
 *
 * Ownership: assignment → lesson → course → user; member → user.
 */
export async function POST(request: Request) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  let body: CreateSubmissionBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.assignmentId || !body.memberId || !body.contentText?.trim()) {
    return NextResponse.json(
      { error: '`assignmentId`, `memberId`, and non-empty `contentText` are required' },
      { status: 400 },
    );
  }

  // Verify ownership of the assignment.
  const assignment = await prisma.assignment.findUnique({
    where: { id: body.assignmentId },
    include: { lesson: { include: { course: { select: { userId: true } } } } },
  });
  if (!assignment || assignment.lesson.course.userId !== userId) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  // Verify ownership of the member.
  const member = await prisma.member.findUnique({ where: { id: body.memberId } });
  if (!member || member.userId !== userId || member.deletedAt) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  // Resolve rubric: explicit override → assignment default → null (caller can attach later).
  let rubricId: string | null = null;
  if (body.rubricId) {
    const r = await prisma.writingRubric.findUnique({ where: { id: body.rubricId } });
    if (!r || r.ownerId !== userId) {
      return NextResponse.json({ error: 'Rubric not found' }, { status: 404 });
    }
    rubricId = r.id;
  } else if (assignment.rubricId) {
    rubricId = assignment.rubricId;
  }

  const submission = await prisma.submission.create({
    data: {
      assignmentId: body.assignmentId,
      memberId: body.memberId,
      contentText: body.contentText,
      status: 'pending',
      rubricId,
    },
  });

  return NextResponse.json({ submission }, { status: 201 });
}
