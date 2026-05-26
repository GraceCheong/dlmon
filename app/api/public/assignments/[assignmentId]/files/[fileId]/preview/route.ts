import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import { findAssignmentFileForMember } from '@/lib/public-assignment-file-access';

export const runtime = 'nodejs';

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

  let servePath: string;
  if (file.fileType === 'pdf') {
    servePath = file.storagePath;
  } else if (file.conversionStatus === 'done' && file.convertedPath) {
    servePath = file.convertedPath;
  } else {
    return NextResponse.json(
      { error: 'Preview not available', conversionStatus: file.conversionStatus },
      { status: 409 },
    );
  }

  try {
    const buffer = await fs.readFile(servePath);
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(file.originalName)}.pdf"`,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File read error' }, { status: 500 });
  }
}
