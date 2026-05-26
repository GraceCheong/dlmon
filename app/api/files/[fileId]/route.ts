import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';
import fs from 'fs/promises';

export async function GET(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { fileId } = await params;

  const file = await prisma.uploadedFile.findUnique({ where: { id: fileId } });
  if (!file || file.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    file: {
      id: file.id,
      originalName: file.originalName,
      fileType: file.fileType,
      fileSize: file.fileSize,
      conversionStatus: file.conversionStatus,
      description: file.description,
      createdAt: file.createdAt,
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { fileId } = await params;

  const file = await prisma.uploadedFile.findUnique({ where: { id: fileId } });
  if (!file || file.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Delete physical files.
  const paths = [file.storagePath, file.convertedPath].filter(Boolean) as string[];
  await Promise.allSettled(paths.map((p) => fs.unlink(p)));

  await prisma.uploadedFile.delete({ where: { id: fileId } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { fileId } = await params;

  const file = await prisma.uploadedFile.findUnique({ where: { id: fileId } });
  if (!file || file.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const updates: { originalName?: string; description?: string | null } = {};

  if ('originalName' in body) {
    const name = typeof body.originalName === 'string' ? body.originalName.trim() : '';
    if (!name) return NextResponse.json({ error: 'originalName cannot be empty' }, { status: 400 });
    updates.originalName = name;
  }

  if ('description' in body) {
    updates.description = typeof body.description === 'string' ? body.description.trim() || null : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
  }

  const updated = await prisma.uploadedFile.update({ where: { id: fileId }, data: updates });

  return NextResponse.json({
    file: {
      id: updated.id,
      originalName: updated.originalName,
      fileType: updated.fileType,
      fileSize: updated.fileSize,
      conversionStatus: updated.conversionStatus,
      description: updated.description,
      createdAt: updated.createdAt,
    },
  });
}
