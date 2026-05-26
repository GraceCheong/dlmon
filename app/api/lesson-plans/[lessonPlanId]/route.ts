import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

export async function GET(_req: Request, { params }: { params: Promise<{ lessonPlanId: string }> }) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { lessonPlanId } = await params;

  const plan = await prisma.lessonPlan.findUnique({ where: { id: lessonPlanId } });
  if (!plan || plan.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ plan });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ lessonPlanId: string }> }) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { lessonPlanId } = await params;

  const plan = await prisma.lessonPlan.findUnique({ where: { id: lessonPlanId } });
  if (!plan || plan.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updated = await prisma.lessonPlan.update({
    where: { id: lessonPlanId },
    data: {
      ...(typeof body.title === 'string' && { title: body.title.trim() }),
      ...(body.content !== undefined && {
        content: typeof body.content === 'string' ? body.content : JSON.stringify(body.content),
      }),
      ...(body.targetAudience !== undefined && { targetAudience: body.targetAudience as string | null }),
      ...(body.hskLevel !== undefined && { hskLevel: body.hskLevel as string | null }),
    },
  });
  return NextResponse.json({ plan: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ lessonPlanId: string }> }) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { lessonPlanId } = await params;

  const plan = await prisma.lessonPlan.findUnique({ where: { id: lessonPlanId } });
  if (!plan || plan.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.lessonPlan.delete({ where: { id: lessonPlanId } });
  return NextResponse.json({ ok: true });
}
