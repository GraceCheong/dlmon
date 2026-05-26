'use client';

import React from 'react';
import { useEditor } from '@/context/EditorContext';
import { renderBlock } from '@/components/editor/BlockRegistry';

export default function PublicBlockList() {
  const { blocks } = useEditor();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {blocks.map((block) => (
        <div key={block.id} style={{ marginBottom: '2rem' }}>
          {renderBlock(block.type, { id: block.id, content: block.content, publicMode: true })}
        </div>
      ))}
    </div>
  );
}
