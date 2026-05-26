import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { EditorProvider } from '@/context/EditorContext';
import EditorCanvas from '@/components/editor/EditorCanvas';
import EditorToolbar from '@/components/editor/EditorToolbar';
import { requireUserOrRedirect } from '@/lib/auth-helpers';

export default async function LessonEditorPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const userId = await requireUserOrRedirect();

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      course: { select: { userId: true } },
      blocks: {
        orderBy: {
          order: 'asc'
        }
      }
    }
  });

  if (!lesson || lesson.course.userId !== userId) {
    notFound();
  }

  // Parse block content from JSON strings
  const initialBlocks = lesson.blocks.map(b => ({
    id: b.id,
    type: b.type,
    content: JSON.parse(b.content as string),
    order: b.order
  }));

  return (
    <EditorProvider initialBlocks={initialBlocks} lessonId={lessonId} courseId={lesson.courseId}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 4rem)' }}>
        <EditorToolbar
          lessonId={lessonId}
          courseId={lesson.courseId}
          title={lesson.title}
          initialStatus={lesson.status}
        />

        {/* Workspace */}
        <div style={{ flex: 1, padding: '0 1rem' }}>
          <EditorCanvas />
        </div>
      </div>
    </EditorProvider>
  );
}
