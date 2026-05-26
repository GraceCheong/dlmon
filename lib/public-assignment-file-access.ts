import prisma from '@/lib/prisma';

export async function findAssignmentFileForMember(assignmentId: string, fileId: string, memberId: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      lesson: { select: { course: { select: { userId: true } } } },
      attachments: {
        where: { uploadedFileId: fileId },
        select: {
          uploadedFile: true,
        },
      },
    },
  });
  if (!assignment || assignment.attachments.length === 0) return null;

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { userId: true, deletedAt: true },
  });
  if (!member || member.deletedAt || member.userId !== assignment.lesson.course.userId) {
    return null;
  }

  return assignment.attachments[0].uploadedFile;
}
