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

  // Determine which file to serve for preview.
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
