import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

export async function POST(request: Request) {
  try {
    const auth = await requireUserOrUnauthorized();
    if (auth instanceof NextResponse) return auth;
    // userId is available as `auth` here; not currently used for assignment creation
    void auth;

    const body = await request.json();
    
    if (!body.title || !body.lessonId || !body.prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const assignment = await prisma.assignment.create({
      data: {
        title: body.title,
        lessonId: body.lessonId,
        type: body.type || 'writing',
        prompt: body.prompt,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      }
    });

    return NextResponse.json(assignment);
  } catch (error) {
    console.error('Failed to create assignment:', error);
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
  }
}
