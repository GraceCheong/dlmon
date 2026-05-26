import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';
import {
  ensureUploadsDir, buildStoragePath, buildConvertedPath,
  detectFileType, MAX_FILE_SIZE,
  isLibreOfficeAvailable, convertToPdf, UPLOADS_DIR,
} from '@/lib/file-upload';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: '`file` field is required' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File exceeds 100 MB limit' }, { status: 413 });
  }

  const fileType = detectFileType(file.name);
  if (!fileType) {
    return NextResponse.json({ error: 'Only PDF, HWP, and HWPX files are supported' }, { status: 415 });
  }

  const description = formData.get('description');
  const fileId = uuidv4();
  const storagePath = buildStoragePath(fileId, fileType);

  await ensureUploadsDir();
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(storagePath, buffer);

  const isPdf = fileType === 'pdf';
  const conversionStatus = isPdf ? 'not_needed' : 'pending';

  const record = await prisma.uploadedFile.create({
    data: {
      id: fileId,
      userId,
      originalName: file.name,
      fileType,
      fileSize: file.size,
      storagePath,
      conversionStatus,
      description: typeof description === 'string' ? description : null,
    },
  });

  // Trigger async conversion for HWP/HWPX (fire-and-forget).
  if (!isPdf) {
    triggerConversion(fileId, storagePath).catch((err) =>
      console.error(`[file-upload] conversion failed for ${fileId}:`, err),
    );
  }

  return NextResponse.json({
    file: {
      id: record.id,
      originalName: record.originalName,
      fileType: record.fileType,
      fileSize: record.fileSize,
      conversionStatus: record.conversionStatus,
      description: record.description,
      createdAt: record.createdAt,
    },
  }, { status: 201 });
}

async function triggerConversion(fileId: string, storagePath: string) {
  await prisma.uploadedFile.update({
    where: { id: fileId },
    data: { conversionStatus: 'processing' },
  });

  const available = await isLibreOfficeAvailable();
  if (!available) {
    await prisma.uploadedFile.update({
      where: { id: fileId },
      data: { conversionStatus: 'failed' },
    });
    return;
  }

  try {
    const outputPath = await convertToPdf(storagePath, UPLOADS_DIR);
    const expectedPath = buildConvertedPath(fileId);
    // LibreOffice may produce a differently named file — rename to our convention.
    try {
      await fs.rename(outputPath, expectedPath);
    } catch {
      // Already at expected path.
    }
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
}
