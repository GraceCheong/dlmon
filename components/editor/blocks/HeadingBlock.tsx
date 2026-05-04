'use client';

import { useEditor } from '@/context/EditorContext';

export default function HeadingBlock({ id, content }: { id: string, content: { text: string, level: number } }) {
  const { updateBlock } = useEditor();

  return (
    <div style={{ width: '100%' }}>
      <input
        type="text"
        value={content.text || ''}
        onChange={(e) => updateBlock(id, { text: e.target.value })}
        placeholder="Enter heading..."
        style={{
          width: '100%',
          border: 'none',
          outline: 'none',
          fontSize: content.level === 1 ? '1.875rem' : '1.5rem',
          fontWeight: 700,
          background: 'transparent',
          color: 'var(--foreground)',
          padding: '0.5rem 0'
        }}
      />
    </div>
  );
}
