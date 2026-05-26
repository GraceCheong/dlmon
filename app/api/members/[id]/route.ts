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
  if (!member || member.userId !== userId || member.deletedAt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: { name?: string; email?: string | null; role?: string; className?: string | null; metadata?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const data: {
    name?: string;
    email?: string | null;
    role?: string;
    className?: string | null;
    metadata?: string | null;
  } = {};
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
  if ('email' in body) {
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }
    data.email = email || null;
  }
  if (typeof body.role === 'string' && body.role.trim()) data.role = body.role.trim();
  if ('className' in body) {
    data.className = typeof body.className === 'string' && body.className.trim()
      ? body.className.trim()
      : null;
  }
  if ('metadata' in body) {
    data.metadata = body.metadata === undefined || body.metadata === null || body.metadata === ''
      ? null
      : JSON.stringify(body.metadata);
  }

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
  if (!member || member.userId !== userId || member.deletedAt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const activeSubmissions = await prisma.submission.count({
    where: {
      memberId: id,
      status: { not: 'draft' },
    },
  });
  if (activeSubmissions > 0) {
    return NextResponse.json(
      { error: 'Cannot delete member with active submissions' },
      { status: 409 },
    );
  }

  await prisma.member.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
