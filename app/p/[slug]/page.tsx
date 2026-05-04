import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { EditorProvider } from '@/context/EditorContext';
import { renderBlock } from '@/components/editor/BlockRegistry';
import { Sparkles, Languages } from 'lucide-react';
import Link from 'next/link';

export default async function PublicLessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const lesson = await prisma.lesson.findUnique({
    where: { slug },
    include: {
      blocks: {
        orderBy: {
          order: 'asc'
        }
      },
      course: true
    }
  });

  if (!lesson || lesson.status !== 'published') {
    notFound();
  }

  const blocks = lesson.blocks.map(b => ({
    id: b.id,
    type: b.type,
    content: JSON.parse(b.content as string),
    order: b.order
  }));

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', paddingBottom: '5rem' }}>
      {/* Student View Header */}
      <nav style={{ 
        background: 'rgba(255, 255, 255, 0.8)', 
        backdropFilter: 'blur(10px)', 
        borderBottom: '1px solid var(--card-border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '0.75rem 0'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Sparkles size={20} color="var(--primary)" />
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', lineHeight: 1 }}>{lesson.title}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>{lesson.course.title}</span>
            </div>
          </div>
          <Link href="/" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>
            LETTO
          </Link>
        </div>
      </nav>

      {/* Lesson Content Area */}
      <main style={{ maxWidth: '800px', margin: '3rem auto', padding: '0 1.5rem' }}>
        <EditorProvider initialBlocks={blocks} initialIsPreview={true}>
          <PublicBlockList />
        </EditorProvider>
      </main>

      <footer style={{ marginTop: '5rem', textAlign: 'center', padding: '2rem', color: 'var(--secondary)', fontSize: '0.875rem' }}>
        Educational content authored using Letto Teacher Studio.
      </footer>
    </div>
  );
}

import PublicBlockList from '@/components/public/PublicBlockList';
