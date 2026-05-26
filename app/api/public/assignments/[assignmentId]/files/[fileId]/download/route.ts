import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { findAssignmentFileForMember } from '@/lib/public-assignment-file-access';

export const runtime = 'nodejs';

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  hwp: 'application/x-hwp',
  hwpx: 'application/zip',
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string; fileId: string }> },
) {
  const { assignmentId, fileId } = await params;
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('memberId');
  if (!memberId) {
    return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
  }

  const file = await findAssignmentFileForMember(assignmentId, fileId, memberId);
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const buffer = await fs.readFile(file.storagePath);
    const mime = MIME_TYPES[file.fileType] || 'application/octet-stream';
    const safeFilename = path.basename(file.originalName);
    return new Response(buffer, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(safeFilename)}"`,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File read error' }, { status: 500 });
  }
}
