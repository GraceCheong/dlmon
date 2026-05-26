import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import { findPublishedLessonFile } from '@/lib/public-file-access';

export async function GET(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const file = await findPublishedLessonFile(fileId);
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
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File read error' }, { status: 500 });
  }
}
