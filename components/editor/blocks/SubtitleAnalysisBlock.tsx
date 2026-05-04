'use client';

import { useEditor } from '@/context/EditorContext';
import { ListMusic, Plus, Trash2, Video } from 'lucide-react';


interface Highlight {
  id: string;
  word: string;
  pinyin: string;
  meaning: string;
  note: string;
}

export default function SubtitleAnalysisBlock({ id, content }: { id: string, content: { url: string, highlights: Highlight[] } }) {
  const { updateBlock, isPreview } = useEditor();

  const handleAddHighlight = () => {
    const newH = { id: Date.now().toString(), word: '', pinyin: '', meaning: '', note: '' };
    updateBlock(id, { highlights: [...(content.highlights || []), newH] });
  };

  const handleUpdateHL = (hlId: string, updates: Partial<Highlight>) => {
    const newHLs = content.highlights.map(hl => 
      hl.id === hlId ? { ...hl, ...updates } : hl
    );
    updateBlock(id, { highlights: newHLs });
  };

  const handleRemoveHL = (hlId: string) => {
    updateBlock(id, { highlights: content.highlights.filter(hl => hl.id !== hlId) });
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : '';
  };

  const embedUrl = getEmbedUrl(content.url);

  return (
    <div className="card" style={{ padding: '1.5rem', margin: '1rem 0', border: '1px solid var(--card-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', color: 'var(--primary)' }}>
        <ListMusic size={20} />
        <span style={{ fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Video Subtitle Analysis</span>
      </div>

      {!isPreview ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label className="label">Video URL</label>
            <input 
              type="text" 
              className="input" 
              value={content.url || ''} 
              onChange={(e) => updateBlock(id, { url: e.target.value })}
              placeholder="Paste YouTube URL..."
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <label className="label">Vocabulary & Grammar Highlights</label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {content.highlights?.map((hl) => (
                <div key={hl.id} className="card" style={{ padding: '1rem', background: 'var(--background)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 40px', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <input className="input" value={hl.word} onChange={(e) => handleUpdateHL(hl.id, { word: e.target.value })} placeholder="Word/Phrase" />
                    <input className="input" value={hl.pinyin} onChange={(e) => handleUpdateHL(hl.id, { pinyin: e.target.value })} placeholder="Pinyin" />
                    <input className="input" value={hl.meaning} onChange={(e) => handleUpdateHL(hl.id, { meaning: e.target.value })} placeholder="Meaning" />
                    <button onClick={() => handleRemoveHL(hl.id)} style={{ color: 'var(--error)' }}><Trash2 size={18} /></button>
                  </div>
                  <textarea 
                    className="input" 
                    style={{ height: '60px', padding: '0.5rem', fontSize: '0.875rem' }}
                    value={hl.note} 
                    onChange={(e) => handleUpdateHL(hl.id, { note: e.target.value })}
                    placeholder="Educational note or usage example..."
                  />
                </div>
              ))}
              <button 
                onClick={handleAddHighlight}
                className="btn btn-secondary" 
                style={{ width: 'fit-content', fontSize: '0.875rem' }}
              >
                <Plus size={16} /> Add Analysis Point
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {embedUrl && (
            <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <iframe width="100%" height="100%" src={embedUrl} frameBorder="0" allowFullScreen></iframe>
            </div>
          )}
          
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>Pedagogical Analysis</h3>
            <div className="grid-cols-3">
              {content.highlights?.map((hl) => (
                <div key={hl.id} className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{hl.word}</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--secondary)', background: 'var(--primary-light)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>{hl.pinyin}</span>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{hl.meaning}</div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--secondary)', lineHeight: '1.5' }}>{hl.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: var(--secondary);
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}
