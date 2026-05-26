import prisma from '@/lib/prisma';

function blockReferencesFile(content: string, fileId: string) {
  try {
    const parsed = JSON.parse(content) as { fileId?: unknown };
    return parsed.fileId === fileId;
  } catch {
    return false;
  }
}

export async function findPublishedLessonFile(fileId: string) {
  const file = await prisma.uploadedFile.findUnique({ where: { id: fileId } });
  if (!file) return null;

  const blocks = await prisma.lessonBlock.findMany({
    where: {
      type: 'file-attachment',
      lesson: { status: 'published' },
    },
    select: { content: true },
  });

  return blocks.some((block) => blockReferencesFile(block.content, fileId)) ? file : null;
}
