import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { id } = await params;

  const member = await prisma.member.findUnique({ where: { id } });
  if (!member || member.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: { name?: string; email?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const data: Record<string, string> = {};
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
  if (typeof body.email === 'string' && body.email.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }
    data.email = body.email.trim();
  }
  if (typeof body.role === 'string' && body.role.trim()) data.role = body.role.trim();

  const updated = await prisma.member.update({ where: { id }, data });
  return NextResponse.json({ member: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { id } = await params;

  const member = await prisma.member.findUnique({ where: { id } });
  if (!member || member.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Block deletion when the member already has graded submissions, to avoid losing
  // historical grading data with no UI to recover it.
  const submissionCount = await prisma.submission.count({ where: { memberId: id } });
  if (submissionCount > 0) {
    return NextResponse.json(
      {
        error:
          'Cannot remove a member with submitted work. Archive their submissions first.',
        submissionCount,
      },
      { status: 409 },
    );
  }

  await prisma.member.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
