import prisma from '@/lib/prisma';
import { requireUserOrRedirect } from '@/lib/auth-helpers';
import FilesClient from '@/components/dashboard/FilesClient';

export default async function FilesPage() {
  const userId = await requireUserOrRedirect();

  const rawFiles = await prisma.uploadedFile.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, originalName: true, fileType: true, fileSize: true,
      conversionStatus: true, description: true, createdAt: true,
    },
  });

  const files = rawFiles.map(f => ({ ...f, createdAt: f.createdAt.toISOString() }));

  return <FilesClient initialFiles={files} />;
}
