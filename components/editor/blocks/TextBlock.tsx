'use client';

import { useEditor } from '@/context/EditorContext';
import { useRef, useEffect } from 'react';

export default function TextBlock({ id, content }: { id: string, content: { text: string } }) {
  const { updateBlock } = useEditor();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content.text]);

  return (
    <div style={{ width: '100%', padding: '0.5rem 0' }}>
      <textarea
        ref={textareaRef}
        value={content.text || ''}
        onChange={(e) => updateBlock(id, { text: e.target.value })}
        placeholder="Type something..."
        style={{
          width: '100%',
          border: 'none',
          outline: 'none',
          fontSize: '1rem',
          lineHeight: '1.6',
          background: 'transparent',
          color: 'var(--foreground)',
          resize: 'none',
          overflow: 'hidden',
          fontFamily: 'inherit'
        }}
      />
    </div>
  );
}
