'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { useEditor, Block } from '@/context/EditorContext';
import { renderBlock } from './BlockRegistry';

export default function SortableBlockWrapper({ id, block }: { id: string, block: Block }) {
  const { isPreview } = useEditor();
  
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    transition,
    isDragging
  } = useSortable({ id, disabled: isPreview });

  const { removeBlock, duplicateBlock, moveBlock } = useEditor();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
    marginBottom: isPreview ? '0' : '1rem',
    width: isPreview ? '100%' : undefined,
    maxWidth: isPreview ? '100%' : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={`editor-block-wrapper ${isPreview ? 'is-preview' : ''}`}>
      <div className={isPreview ? 'preview-mode-card' : 'card'} style={{ 
        padding: isPreview ? '0' : '1rem', 
        position: 'relative', 
        border: isPreview ? 'none' : '1px solid var(--card-border)',
        boxShadow: isPreview ? 'none' : 'var(--card-shadow)',
        background: isPreview ? 'transparent' : 'var(--card-bg)',
        width: '100%',
      }}>
        {/* Drag Handle */}
        {!isPreview && (
          <div 
            {...attributes} 
            {...listeners} 
            style={{ 
              position: 'absolute', 
              left: '-40px', 
              top: '12px', 
              padding: '8px', 
              cursor: 'grab', 
              color: 'var(--secondary)',
              opacity: 0,
              transition: 'opacity 0.2s ease'
            }}
            className="drag-handle"
          >
            <GripVertical size={20} />
          </div>
        )}

        {/* Block Controls (Hover) */}
        {!isPreview && (
          <div 
            style={{ 
              position: 'absolute', 
              right: '10px', 
              top: '10px', 
              display: 'flex', 
              gap: '4px',
              opacity: 0,
              transition: 'opacity 0.2s ease',
              zIndex: 20
            }}
            className="block-controls"
          >
            <button onClick={() => moveBlock(id, 'up')} className="control-btn"><ChevronUp size={16} /></button>
            <button onClick={() => moveBlock(id, 'down')} className="control-btn"><ChevronDown size={16} /></button>
            <button onClick={() => duplicateBlock(id)} className="control-btn"><Copy size={16} /></button>
            <button onClick={() => removeBlock(id)} className="control-btn" style={{ color: 'var(--error)' }}><Trash2 size={16} /></button>
          </div>
        )}

        {/* The Actual Block Content */}
        {renderBlock(block.type, { id, content: block.content })}
      </div>

      <style jsx>{`
        .editor-block-wrapper:not(.is-preview):hover .drag-handle,
        .editor-block-wrapper:not(.is-preview):hover .block-controls {
          opacity: 1 !important;
        }
        .control-btn {
          padding: 4px;
          border-radius: 4px;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          color: var(--secondary);
        }
        .control-btn:hover {
          background: var(--primary-light);
          color: var(--primary);
        }
        .preview-mode-card {
          margin-bottom: 2rem;
          width: 100%;
        }
      `}</style>
    </div>
  );
}
