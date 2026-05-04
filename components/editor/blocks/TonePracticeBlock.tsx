'use client';

import { useEditor } from '@/context/EditorContext';
import { Languages, Volume2 } from 'lucide-react';

export default function TonePracticeBlock({ id, content }: { id: string, content: { text: string, pinyin: string } }) {
  const { updateBlock, isPreview } = useEditor();

  const getToneColor = (char: string) => {
    // Basic tone numbering recognition if pinyin is like "ma1", "ma2", etc.
    // Or we can manually tag. For MVP, we'll use a simple mapping.
    if (char.includes('1') || '/āēīōūǖ'.split('').some(v => char.includes(v))) return '#ef4444'; // Red
    if (char.includes('2') || '/áéíóúǘ'.split('').some(v => char.includes(v))) return '#f59e0b'; // Orange
    if (char.includes('3') || '/ǎěǐǒǔǚ'.split('').some(v => char.includes(v))) return '#10b981'; // Green
    if (char.includes('4') || '/àèìòùǜ'.split('').some(v => char.includes(v))) return '#3b82f6'; // Blue
    return 'var(--secondary)';
  };

  return (
    <div className="card" style={{ padding: '1.5rem', margin: '1rem 0', border: '1px solid var(--card-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', color: 'var(--primary)' }}>
        <Languages size={20} />
        <span style={{ fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Tone & Pronunciation</span>
      </div>

      {!isPreview ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="label">Chinese Text</label>
              <input 
                type="text" 
                className="input" 
                value={content.text || ''} 
                onChange={(e) => updateBlock(id, { text: e.target.value })}
                placeholder="e.g. 老师好"
              />
            </div>
            <div>
              <label className="label">Pinyin (with Tones)</label>
              <input 
                type="text" 
                className="input" 
                value={content.pinyin || ''} 
                onChange={(e) => updateBlock(id, { pinyin: e.target.value })}
                placeholder="e.g. lǎo shī hǎo"
              />
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>
            Tip: Use tone marks (ā, á, ǎ, à) or numbers (1, 2, 3, 4) in Pinyin for visual encoding.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', padding: '1rem 0' }}>
          <div style={{ display: 'flex', gap: '2rem' }}>
            {content.text?.split('').map((char, index) => {
              const pinyinArray = content.pinyin?.split(' ') || [];
              const pinyin = pinyinArray[index] || '';
              const color = getToneColor(pinyin);

              return (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem', color: color, fontWeight: 700, fontFamily: 'serif' }}>{pinyin}</span>
                  <span style={{ fontSize: '3rem', fontWeight: 600 }}>{char}</span>
                </div>
              );
            })}
          </div>
          <button className="btn btn-secondary" style={{ borderRadius: '2rem' }}>
            <Volume2 size={20} /> Listen to Pronunciation
          </button>
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
