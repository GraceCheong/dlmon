import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { EditorProvider } from '@/context/EditorContext';
import EditorCanvas from '@/components/editor/EditorCanvas';
import EditorToolbar from '@/components/editor/EditorToolbar';
import Link from 'next/link';
import { ChevronLeft, Eye, Save, Send } from 'lucide-react';

export default async function LessonEditorPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      blocks: {
        orderBy: {
          order: 'asc'
        }
      }
    }
  });

  if (!lesson) {
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
    <EditorProvider initialBlocks={initialBlocks}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 4rem)' }}>
        <EditorToolbar 
          lessonId={lessonId} 
          courseId={lesson.courseId} 
          title={lesson.title} 
        />

        {/* Workspace */}
        <div style={{ flex: 1, padding: '0 1rem' }}>
          <EditorCanvas />
        </div>
      </div>
    </EditorProvider>
  );
}
