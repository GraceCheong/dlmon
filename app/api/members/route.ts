import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

export async function GET() {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const members = await prisma.member.findMany({
    where: { userId, deletedAt: null },
    orderBy: { joinedAt: 'desc' },
  });

  return NextResponse.json({ members });
}

export async function POST(request: Request) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  let body: { name?: string; email?: string; role?: string; className?: string; metadata?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim() || null;
  const role = body.role?.trim() || 'student';
  const className = body.className?.trim() || null;
  const metadata = body.metadata === undefined || body.metadata === null || body.metadata === ''
    ? null
    : JSON.stringify(body.metadata);

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
  }

  // Disallow duplicate (userId, email) pairs — same teacher inviting same email twice.
  const existing = email
    ? await prisma.member.findFirst({ where: { userId, email, deletedAt: null } })
    : null;
  if (email && existing) {
    return NextResponse.json(
      { error: 'A member with that email is already enrolled with you' },
      { status: 409 },
    );
  }

  const member = await prisma.member.create({
    data: { name, email, role, className, metadata, userId },
  });

  return NextResponse.json({ member }, { status: 201 });
}
