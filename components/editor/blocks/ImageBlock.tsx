'use client';

import { useEditor } from '@/context/EditorContext';
import { Image as ImageIcon, X } from 'lucide-react';

import { useState } from 'react';

const SIZE_OPTIONS = [
  { label: '25%', value: 25 },
  { label: '50%', value: 50 },
  { label: '75%', value: 75 },
  { label: '100%', value: 100 },
];

export default function ImageBlock({ id, content }: { id: string, content: { url: string, caption: string, widthPct?: number } }) {
  const { updateBlock, isPreview } = useEditor();
  const [isDragging, setIsDragging] = useState(false);

  const widthPct = content.widthPct ?? 100;

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      updateBlock(id, { url: result });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  return (
    <div style={{ width: '100%', margin: '1rem 0' }}>
      {!content.url ? (
        <div 
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          style={{ 
            background: isDragging ? 'var(--primary-light)' : '#F8FAFC', 
            border: isDragging ? '2px solid var(--primary)' : '2px dashed #E2E8F0', 
            borderRadius: 'var(--radius-lg)',
            padding: '3rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            color: isDragging ? 'var(--primary)' : '#A0AEC0',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onClick={() => document.getElementById(`file-input-${id}`)?.click()}
        >
          <ImageIcon size={48} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 700, color: '#4A5568' }}>이미지를 드래그하여 업로드하거나 클릭하세요</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>또는 아래에 URL을 붙여넣으세요</p>
          </div>
          <input 
            type="text" 
            value={content.url ?? ''}
            placeholder="https://example.com/image.png" 
            className="input"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => updateBlock(id, { url: e.target.value })}
            style={{ maxWidth: '400px', background: 'white' }}
          />
          <input 
            id={`file-input-${id}`}
            type="file" 
            accept="image/*" 
            style={{ display: 'none' }} 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: widthPct < 100 ? 'center' : 'stretch', gap: 0 }}>
          <div style={{ position: 'relative', width: `${widthPct}%` }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Editor accepts arbitrary data URLs and pasted external image URLs. */}
            <img 
              src={content.url} 
              alt={content.caption} 
              style={{ width: '100%', borderRadius: 'var(--radius-md)', display: 'block' }} 
            />
            {!isPreview && (
              <button 
                onClick={() => updateBlock(id, { url: '' })}
                style={{ 
                  position: 'absolute', 
                  top: '10px', 
                  right: '10px', 
                  background: 'rgba(0,0,0,0.5)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '50%', 
                  width: '32px', 
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Size selector — edit mode only */}
          {!isPreview && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', justifyContent: widthPct < 100 ? 'center' : 'flex-start' }}>
              <span style={{ fontSize: '0.75rem', color: '#A0AEC0', fontWeight: 600, marginRight: '0.25rem' }}>크기</span>
              {SIZE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateBlock(id, { widthPct: opt.value })}
                  style={{
                    padding: '0.2rem 0.55rem',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    borderRadius: '999px',
                    border: widthPct === opt.value ? '2px solid var(--primary)' : '1px solid #E2E8F0',
                    background: widthPct === opt.value ? 'var(--primary-light)' : '#F8FAFC',
                    color: widthPct === opt.value ? 'var(--primary-hover)' : '#718096',
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Caption */}
          {isPreview ? (
            content.caption ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--secondary)', textAlign: 'center', padding: '0.5rem 0' }}>
                {content.caption}
              </p>
            ) : null
          ) : (
            <input
              type="text"
              value={content.caption || ''}
              onChange={(e) => updateBlock(id, { caption: e.target.value })}
              placeholder="Add a caption..."
              style={{
                width: `${widthPct}%`,
                alignSelf: widthPct < 100 ? 'center' : undefined,
                border: 'none',
                outline: 'none',
                fontSize: '0.875rem',
                color: 'var(--secondary)',
                textAlign: 'center',
                padding: '0.5rem 0',
                background: 'transparent',
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
