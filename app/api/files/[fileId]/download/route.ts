import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';
import fs from 'fs/promises';
import path from 'path';

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  hwp: 'application/x-hwp',
  hwpx: 'application/zip',
};

export async function GET(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { fileId } = await params;

  const file = await prisma.uploadedFile.findUnique({ where: { id: fileId } });
  if (!file || file.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const buffer = await fs.readFile(file.storagePath);
    const mime = MIME_TYPES[file.fileType] || 'application/octet-stream';
    const safeFilename = path.basename(file.originalName);
    return new Response(buffer, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(safeFilename)}"`,
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File read error' }, { status: 500 });
  }
}
