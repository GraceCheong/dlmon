'use client';

import { useEditor } from '@/context/EditorContext';
import { Link as LinkIcon, Loader2, PlayCircle, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface YouTubeLinkBlockData {
  url: string;
  videoId: string;
  title?: string;
  thumbnailUrl?: string;
  originalUrl: string;
  thumbnailStatus: 'available' | 'unavailable' | 'failed';
}

export default function YouTubeLinkBlock({ id, content }: { id: string; content: Partial<YouTubeLinkBlockData> }) {
  const { updateBlock, isPreview } = useEditor();
  const [inputUrl, setInputUrl] = useState(content.url || '');
  const [manualTitle, setManualTitle] = useState(content.title || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFetchMetadata = async () => {
    if (!inputUrl.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/youtube/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: inputUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '메타데이터를 가져오지 못했습니다.');
        return;
      }
      updateBlock(id, {
        url: data.originalUrl,
        videoId: data.videoId,
        title: data.title || manualTitle.trim() || '',
        thumbnailUrl: data.thumbnailUrl,
        originalUrl: data.originalUrl,
        thumbnailStatus: data.isThumbnailAvailable ? 'available' : 'unavailable',
      });
    } catch {
      setError('서버와 통신하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Video loaded — show playable embed (both edit and preview modes)
  if (content.videoId) {
    return (
      <div style={{ margin: '1rem 0' }}>

        {/* ── Playable embed ── shown in editor and preview; hidden by EditorToolbar during PDF export */}
        <div
          data-yt-embed="true"
          style={{
            position: 'relative',
            width: '100%',
            paddingBottom: '56.25%',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            background: '#000',
          }}
        >
          <iframe
            src={`https://www.youtube.com/embed/${content.videoId}`}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={content.title || 'YouTube 영상'}
          />
        </div>

        {content.title && (
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#4A5568', marginTop: '0.5rem' }}>
            {content.title}
          </p>
        )}

        {/* ── PDF-only fallback ── hidden in browser; EditorToolbar swaps this visible and hides iframe before capturing PDF */}
        <div
          data-yt-pdf-fallback="true"
          style={{ display: 'none', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}
        >
          <div style={{ display: 'flex', gap: '1rem', padding: '1rem', alignItems: 'flex-start' }}>
            <div style={{
              flexShrink: 0, width: '160px', height: '90px',
              borderRadius: 'var(--radius-md)', overflow: 'hidden',
              background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {content.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={content.thumbnailUrl}
                  alt={content.title || '유튜브 썸네일'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <PlayCircle size={40} color="#FF0000" />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.4rem', color: '#1A202C' }}>
                {content.title || '(제목 없음)'}
              </p>
              <a
                href={content.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '0.8rem', color: '#3B82F6', display: 'flex', alignItems: 'center', gap: '0.25rem', wordBreak: 'break-all' }}
              >
                <ExternalLink size={12} />
                {content.originalUrl}
              </a>
            </div>
          </div>
        </div>

        {!isPreview && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <button
              onClick={() => updateBlock(id, { videoId: undefined, url: content.originalUrl || '' })}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
            >
              변경
            </button>
          </div>
        )}
      </div>
    );
  }

  // Input state — no videoId yet
  return (
    <div style={{ border: '2px dashed #CBD5E0', borderRadius: 'var(--radius-lg)', padding: '1.5rem', margin: '1rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#FF0000' }}>
        <PlayCircle size={22} />
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1A202C' }}>유튜브 링크 추가</h3>
      </div>
      <p style={{ fontSize: '0.85rem', color: '#718096', marginBottom: '1rem' }}>
        YouTube URL을 입력하면 수업 자료에 재생 가능한 영상이 삽입됩니다. PDF 저장 시에는 썸네일과 링크로 변환됩니다.
      </p>

      {error && (
        <div style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.9rem', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <LinkIcon size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0' }} />
          <input
            type="text"
            className="input"
            placeholder="https://youtube.com/watch?v=..."
            value={inputUrl}
            onChange={e => setInputUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleFetchMetadata()}
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
        <button
          onClick={handleFetchMetadata}
          disabled={loading || !inputUrl.trim()}
          className="btn btn-primary"
          style={{ whiteSpace: 'nowrap', fontSize: '0.875rem' }}
        >
          {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> 불러오는 중...</> : '추가'}
        </button>
      </div>
      <div style={{ marginTop: '0.75rem' }}>
        <label style={{ display: 'block', color: '#718096', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
          제목 직접 입력 (선택)
        </label>
        <input
          type="text"
          className="input"
          value={manualTitle}
          onChange={e => setManualTitle(e.target.value)}
          placeholder="제목을 가져오지 못했을 때 사용할 표시 제목"
        />
      </div>
      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
