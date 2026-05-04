'use client';

import { useEditor } from '@/context/EditorContext';
import { Video, X } from 'lucide-react';
import { useState } from 'react';

export default function VideoBlock({ id, content }: { id: string, content: { url: string } }) {
  const { updateBlock } = useEditor();
  const [isDragging, setIsDragging] = useState(false);

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('data:video/') || url.startsWith('blob:')) return url;
    
    // Basic YouTube embed conversion
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : '';
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('video/')) {
      alert('비디오 파일만 업로드 가능합니다.');
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

  const embedUrl = getEmbedUrl(content.url);
  const isLocalVideo = content.url.startsWith('data:video/') || content.url.startsWith('blob:');

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
          onClick={() => document.getElementById(`video-input-${id}`)?.click()}
        >
          <Video size={48} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 700, color: '#4A5568' }}>동영상을 드래그하여 업로드하거나 클릭하세요</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>또는 YouTube URL을 붙여넣으세요</p>
          </div>
          <input 
            type="text" 
            placeholder="https://youtube.com/watch?v=..." 
            className="input"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => updateBlock(id, { url: e.target.value })}
            style={{ maxWidth: '400px', background: 'white' }}
          />
          <input 
            id={`video-input-${id}`}
            type="file" 
            accept="video/*" 
            style={{ display: 'none' }} 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000' }}>
          {isLocalVideo ? (
            <video 
              src={content.url} 
              controls 
              style={{ width: '100%', height: '100%' }}
            />
          ) : embedUrl ? (
            <iframe 
              width="100%" 
              height="100%" 
              src={embedUrl} 
              title="YouTube video player" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              잘못된 동영상 형식입니다.
            </div>
          )}
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
              zIndex: 10
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
