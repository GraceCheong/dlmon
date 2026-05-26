'use client';

import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useEditor } from '@/context/EditorContext';
import { useLanguage } from '@/context/LanguageContext';
import SortableBlockWrapper from './SortableBlockWrapper';
import { Plus, Type, Image as ImageIcon, Video, HelpCircle, Heading, BookOpen, PlayCircle, Link as LinkIcon, Paperclip } from 'lucide-react';

export default function EditorCanvas() {
  const { t } = useLanguage();
  const { blocks, setBlocks, addBlock, isPreview } = useEditor();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      setBlocks(arrayMove(blocks, oldIndex, newIndex).map((b, i) => ({ ...b, order: i })));
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '2rem',
        width: '100%',
        maxWidth: isPreview ? '800px' : '1200px',
        margin: '0 auto',
        padding: isPreview ? '0 1.5rem' : 0,
        transition: 'max-width 0.3s ease',
      }}
    >
      {/* Block Palette (Sidebar) */}
      {!isPreview && (
        <div style={{ width: '240px', position: 'sticky', top: '2rem', height: 'fit-content' }}>
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '0.75rem', color: '#A0AEC0', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 800, letterSpacing: '0.1em' }}>{t.editor.addContent}</h3>
            
            <BlockAddButton 
              onClick={() => addBlock('heading', { text: '', level: 1 })} 
              icon={<Heading size={18} />} 
              label={t.editor.blocks.heading} 
            />
            <BlockAddButton 
              onClick={() => addBlock('text', { text: '' })} 
              icon={<Type size={18} />} 
              label={t.editor.blocks.text} 
            />
            <BlockAddButton 
              onClick={() => addBlock('image', { url: '', caption: '' })} 
              icon={<ImageIcon size={18} />} 
              label={t.editor.blocks.image} 
            />
            <BlockAddButton 
              onClick={() => addBlock('video', { url: '' })} 
              icon={<Video size={18} />} 
              label={t.editor.blocks.video} 
            />
            <BlockAddButton
              onClick={() => addBlock('quiz', { question: '', options: [] })}
              icon={<HelpCircle size={18} />}
              label={t.editor.blocks.quiz}
            />
            <BlockAddButton
              onClick={() => addBlock('youtube-link', { url: '', videoId: '', originalUrl: '', thumbnailStatus: 'unavailable' })}
              icon={<LinkIcon size={18} />}
              label={t.editor.blocks.youtubeLink}
            />
            <BlockAddButton
              onClick={() => addBlock('file-attachment', {})}
              icon={<Paperclip size={18} />}
              label={t.editor.blocks.fileAttachment}
            />

            <h3 style={{ fontSize: '0.75rem', color: '#A0AEC0', textTransform: 'uppercase', marginBottom: '0.5rem', marginTop: '1.5rem', fontWeight: 800, letterSpacing: '0.1em' }}>{t.editor.chineseEducation}</h3>

            <BlockAddButton
              onClick={() => addBlock('text-analyzer', { rawText: '' })}
              icon={<BookOpen size={18} />}
              label={t.editor.blocks.textAnalyzer}
            />
            <BlockAddButton
              onClick={() => addBlock('youtube-extract', { url: '' })}
              icon={<PlayCircle size={18} />}
              label={t.editor.blocks.youtubeExtract}
            />
          </div>
        </div>
      )}

      {/* The Canvas */}
      <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={blocks.map(b => b.id)}
            strategy={verticalListSortingStrategy}
            disabled={isPreview}
          >
            <div
              id="editor-canvas-content"
              style={{
                minHeight: '600px',
                paddingBottom: '10rem',
                width: '100%',
                display: isPreview ? 'flex' : 'block',
                flexDirection: isPreview ? 'column' : undefined,
                alignItems: isPreview ? 'center' : undefined,
              }}
            >
              {blocks.length === 0 ? (
                <div style={{ 
                  height: '300px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: 'var(--primary-light)',
                  border: '2px dashed white',
                  borderRadius: 'var(--radius-lg)',
                  color: 'var(--primary)',
                  gap: '1rem',
                  boxShadow: '0 8px 30px rgba(152, 216, 170, 0.1)'
                }}>
                  <Plus size={48} />
                  <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{t.editor.emptyCanvas}</p>
                </div>
              ) : (
                blocks.map((block) => (
                  <SortableBlockWrapper key={block.id} id={block.id} block={block} />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

function BlockAddButton({ onClick, icon, label }: { onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className="btn btn-secondary" 
      style={{ justifyContent: 'flex-start', width: '100%', gap: '0.75rem', fontSize: '0.875rem' }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
