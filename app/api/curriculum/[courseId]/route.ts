import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

interface WeekInput {
  week: number;
  topic: string;
  unit?: string;
  objectives: string;
  activities: string;
  assessment: string;
  type?: 'lesson' | 'midterm' | 'final';
}

function isValidWeek(w: unknown): w is WeekInput {
  if (!w || typeof w !== 'object') return false;
  const x = w as Record<string, unknown>;
  return (
    typeof x.week === 'number' &&
    typeof x.topic === 'string' &&
    typeof x.objectives === 'string' &&
    typeof x.activities === 'string' &&
    typeof x.assessment === 'string' &&
    (x.unit === undefined || typeof x.unit === 'string') &&
    (x.type === undefined || x.type === 'lesson' || x.type === 'midterm' || x.type === 'final')
  );
}

/**
 * Replace the curriculum plan (list of weeks) for a course owned by the
 * current user. The plan is stored as a JSON string in CurriculumPlan.data.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { courseId } = await params;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: { weeks?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Array.isArray(body.weeks) || !body.weeks.every(isValidWeek)) {
    return NextResponse.json({ error: '`weeks` must be an array of week objects' }, { status: 400 });
  }

  // Renumber weeks 1..N so saved order matches the array order.
  const normalized = body.weeks.map((w, i) => ({ ...w, week: i + 1 }));
  const data = JSON.stringify(normalized);

  await prisma.curriculumPlan.upsert({
    where: { courseId },
    update: { data },
    create: { courseId, data },
  });

  // Keep Course.weeks count in sync with the actual plan.
  if (course.weeks !== normalized.length) {
    await prisma.course.update({
      where: { id: courseId },
      data: { weeks: normalized.length },
    });
  }

  return NextResponse.json({ ok: true, weeks: normalized });
}
