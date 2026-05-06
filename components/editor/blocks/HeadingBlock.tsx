'use client';

import { useEditor } from '@/context/EditorContext';
import { useLanguage } from '@/context/LanguageContext';

export default function HeadingBlock({ id, content }: { id: string, content: { text: string, level: number } }) {
  const { updateBlock, isPreview } = useEditor();
  const { t } = useLanguage();

  if (isPreview) {
    if (!content.text) return null;
    const Tag = content.level === 1 ? 'h1' : 'h2';
    return <Tag style={{ fontSize: content.level === 1 ? '1.875rem' : '1.5rem', fontWeight: 700, padding: '0.5rem 0' }}>{content.text}</Tag>;
  }

  return (
    <div style={{ width: '100%' }}>
      <input
        type="text"
        value={content.text || ''}
        onChange={(e) => updateBlock(id, { text: e.target.value })}
        placeholder={t.editor.placeholders.heading}
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
