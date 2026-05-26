import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';
import {
  isLibreOfficeAvailable, convertToPdf, buildConvertedPath, UPLOADS_DIR,
} from '@/lib/file-upload';
import fs from 'fs/promises';

export async function POST(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { fileId } = await params;

  const file = await prisma.uploadedFile.findUnique({ where: { id: fileId } });
  if (!file || file.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (file.fileType === 'pdf') {
    return NextResponse.json({ error: 'PDF files do not require conversion' }, { status: 400 });
  }
  if (file.conversionStatus === 'processing') {
    return NextResponse.json({ error: 'Conversion already in progress' }, { status: 409 });
  }

  await prisma.uploadedFile.update({
    where: { id: fileId },
    data: { conversionStatus: 'processing' },
  });

  // Async retry — fire and forget.
  (async () => {
    const available = await isLibreOfficeAvailable();
    if (!available) {
      await prisma.uploadedFile.update({
        where: { id: fileId },
        data: { conversionStatus: 'failed' },
      });
      return;
    }
    try {
      const outputPath = await convertToPdf(file.storagePath, UPLOADS_DIR);
      const expectedPath = buildConvertedPath(fileId);
      try { await fs.rename(outputPath, expectedPath); } catch { /* already at target */ }
      await prisma.uploadedFile.update({
        where: { id: fileId },
        data: { conversionStatus: 'done', convertedPath: expectedPath },
      });
    } catch {
      await prisma.uploadedFile.update({
        where: { id: fileId },
        data: { conversionStatus: 'failed' },
      });
    }
  })().catch(console.error);

  return NextResponse.json({ conversionStatus: 'processing' });
}
