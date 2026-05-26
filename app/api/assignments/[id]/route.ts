import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

function normalizeAttachmentIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((id): id is string => typeof id === 'string')
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  );
}

const fileSelect = {
  id: true,
  originalName: true,
  fileType: true,
  fileSize: true,
  conversionStatus: true,
  description: true,
  createdAt: true,
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const current = await prisma.assignment.findUnique({
    where: { id },
    include: { lesson: { include: { course: { select: { userId: true } } } } },
  });
  if (!current || current.lesson.course.userId !== userId) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : current.title;
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : current.prompt;
  if (!title || !prompt) {
    return NextResponse.json({ error: 'Title and prompt are required' }, { status: 400 });
  }

  let dueDate = current.dueDate;
  if ('dueDate' in body) {
    if (!body.dueDate) {
      dueDate = null;
    } else {
      dueDate = new Date(String(body.dueDate));
      if (Number.isNaN(dueDate.getTime())) {
        return NextResponse.json({ error: 'Invalid dueDate' }, { status: 400 });
      }
    }
  }

  const type = body.type === 'speaking' ? 'speaking' : body.type === 'writing' ? 'writing' : current.type;
  const hskLevel = typeof body.hskLevel === 'string' && body.hskLevel.trim() ? body.hskLevel.trim() : null;
  const targetAudience = typeof body.targetAudience === 'string' && body.targetAudience.trim()
    ? body.targetAudience.trim()
    : null;
  const attachmentIds = normalizeAttachmentIds(body.attachmentIds);

  if (attachmentIds.length > 0) {
    const files = await prisma.uploadedFile.findMany({
      where: { id: { in: attachmentIds }, userId },
      select: { id: true },
    });
    if (files.length !== attachmentIds.length) {
      return NextResponse.json({ error: 'Attached file not found' }, { status: 404 });
    }
  }

  const assignment = await prisma.$transaction(async (tx) => {
    await tx.assignmentAttachment.deleteMany({ where: { assignmentId: id } });
    if (attachmentIds.length > 0) {
      await tx.assignmentAttachment.createMany({
        data: attachmentIds.map((uploadedFileId) => ({ assignmentId: id, uploadedFileId })),
      });
    }

    return tx.assignment.update({
      where: { id },
      data: {
        title,
        prompt,
        type,
        dueDate,
        hskLevel: type === 'writing' ? hskLevel : null,
        targetAudience: type === 'writing' ? targetAudience : null,
      },
      include: {
        attachments: {
          include: { uploadedFile: { select: fileSelect } },
        },
      },
    });
  });

  return NextResponse.json({
    ...assignment,
    attachments: assignment.attachments.map(({ uploadedFile }) => uploadedFile),
  });
}
