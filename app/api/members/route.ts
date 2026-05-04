import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

export async function GET() {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const members = await prisma.member.findMany({
    where: { userId },
    orderBy: { joinedAt: 'desc' },
  });

  return NextResponse.json({ members });
}

export async function POST(request: Request) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  let body: { name?: string; email?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim();
  const role = body.role?.trim() || 'student';

  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
  }

  // Disallow duplicate (userId, email) pairs — same teacher inviting same email twice.
  const existing = await prisma.member.findFirst({ where: { userId, email } });
  if (existing) {
    return NextResponse.json(
      { error: 'A member with that email is already enrolled with you' },
      { status: 409 },
    );
  }

  const member = await prisma.member.create({
    data: { name, email, role, userId },
  });

  return NextResponse.json({ member }, { status: 201 });
}
