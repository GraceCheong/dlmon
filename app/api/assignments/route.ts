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

function serializeAssignment<T extends {
  attachments?: Array<{
    uploadedFile: {
      id: string;
      originalName: string;
      fileType: string;
      fileSize: number;
      conversionStatus: string;
      description: string | null;
      createdAt: Date;
    };
  }>;
}>(assignment: T) {
  return {
    ...assignment,
    attachments: assignment.attachments?.map(({ uploadedFile }) => ({
      id: uploadedFile.id,
      originalName: uploadedFile.originalName,
      fileType: uploadedFile.fileType,
      fileSize: uploadedFile.fileSize,
      conversionStatus: uploadedFile.conversionStatus,
      description: uploadedFile.description,
      createdAt: uploadedFile.createdAt,
    })) ?? [],
  };
}

export async function POST(request: Request) {
  try {
    const auth = await requireUserOrUnauthorized();
    if (auth instanceof NextResponse) return auth;
    const userId = auth;

    const body = await request.json();

    if (!body.title || !body.lessonId || !body.prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: body.lessonId },
      include: { course: { select: { userId: true } } },
    });
    if (!lesson || lesson.course.userId !== userId) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const type = body.type === 'speaking' ? 'speaking' : 'writing';
    const hskLevel = typeof body.hskLevel === 'string' && body.hskLevel.trim()
      ? body.hskLevel.trim()
      : null;
    const targetAudience = typeof body.targetAudience === 'string' && body.targetAudience.trim()
      ? body.targetAudience.trim()
      : null;
    const attachmentIds = normalizeAttachmentIds(body.attachmentIds);
    let rubricId: string | null = null;

    if (typeof body.rubricId === 'string' && body.rubricId.trim()) {
      const rubric = await prisma.writingRubric.findUnique({ where: { id: body.rubricId.trim() } });
      if (!rubric || rubric.ownerId !== userId || rubric.status !== 'active') {
        return NextResponse.json({ error: 'Rubric not found' }, { status: 404 });
      }
      rubricId = rubric.id;
    }

    if (attachmentIds.length > 0) {
      const files = await prisma.uploadedFile.findMany({
        where: { id: { in: attachmentIds }, userId },
        select: { id: true },
      });
      if (files.length !== attachmentIds.length) {
        return NextResponse.json({ error: 'Attached file not found' }, { status: 404 });
      }
    }

    let dueDate: Date | null = null;
    if (body.dueDate) {
      dueDate = new Date(body.dueDate);
      if (Number.isNaN(dueDate.getTime())) {
        return NextResponse.json({ error: 'Invalid dueDate' }, { status: 400 });
      }
    }

    const assignment = await prisma.assignment.create({
      data: {
        title: String(body.title).trim(),
        lessonId: body.lessonId,
        type,
        prompt: String(body.prompt).trim(),
        dueDate,
        hskLevel,
        targetAudience,
        rubricId,
        attachments: attachmentIds.length
          ? {
              create: attachmentIds.map((uploadedFileId) => ({
                uploadedFile: { connect: { id: uploadedFileId } },
              })),
            }
          : undefined,
      },
      include: {
        attachments: {
          include: {
            uploadedFile: {
              select: {
                id: true,
                originalName: true,
                fileType: true,
                fileSize: true,
                conversionStatus: true,
                description: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(serializeAssignment(assignment));
  } catch (error) {
    console.error('Failed to create assignment:', error);
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
  }
}
