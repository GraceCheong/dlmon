'use client';

import { useEditor } from '@/context/EditorContext';
import { useLanguage } from '@/context/LanguageContext';
import { useRef, useEffect } from 'react';

export default function TextBlock({ id, content }: { id: string, content: { text: string } }) {
  const { updateBlock, isPreview } = useEditor();
  const { t } = useLanguage();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content.text]);

  if (isPreview) {
    if (!content.text) return null;
    return <p style={{ fontSize: '1rem', lineHeight: '1.6', padding: '0.5rem 0' }}>{content.text}</p>;
  }

  return (
    <div style={{ width: '100%', padding: '0.5rem 0' }}>
      <textarea
        ref={textareaRef}
        value={content.text || ''}
        onChange={(e) => updateBlock(id, { text: e.target.value })}
        placeholder={t.editor.placeholders.text}
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
