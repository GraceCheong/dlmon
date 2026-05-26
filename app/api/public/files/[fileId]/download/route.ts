import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { findPublishedLessonFile } from '@/lib/public-file-access';

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  hwp: 'application/x-hwp',
  hwpx: 'application/zip',
};

export async function GET(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const file = await findPublishedLessonFile(fileId);
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const buffer = await fs.readFile(file.storagePath);
    const mime = MIME_TYPES[file.fileType] || 'application/octet-stream';
    const safeFilename = path.basename(file.originalName);
    return new Response(buffer, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(safeFilename)}"`,
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File read error' }, { status: 500 });
  }
}
