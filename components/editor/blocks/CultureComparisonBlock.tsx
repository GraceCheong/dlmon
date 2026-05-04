'use client';

import { useEditor } from '@/context/EditorContext';
import React from 'react';
import { Globe, Plus, Trash2 } from 'lucide-react';


interface ComparisonItem {
  id: string;
  label: string;
  chinese: string;
  other: string;
}

export default function CultureComparisonBlock({ id, content }: { id: string, content: { theme: string, otherCulture: string, items: ComparisonItem[] } }) {
  const { updateBlock, isPreview } = useEditor();

  const handleAddItem = () => {
    const newItem = { id: Date.now().toString(), label: '', chinese: '', other: '' };
    updateBlock(id, { items: [...(content.items || []), newItem] });
  };

  const handleUpdateItem = (itemId: string, updates: Partial<ComparisonItem>) => {
    const newItems = content.items.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    );
    updateBlock(id, { items: newItems });
  };

  const handleRemoveItem = (itemId: string) => {
    updateBlock(id, { items: content.items.filter(item => item.id !== itemId) });
  };

  return (
    <div className="card" style={{ padding: '1.5rem', margin: '1rem 0', border: '1px solid var(--card-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', color: 'var(--primary)' }}>
        <Globe size={20} />
        <span style={{ fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Cross-Cultural Comparison</span>
      </div>

      {!isPreview ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="label">Comparison Theme</label>
              <input 
                type="text" 
                className="input" 
                value={content.theme || ''} 
                onChange={(e) => updateBlock(id, { theme: e.target.value })}
                placeholder="e.g. Traditional Festivals"
              />
            </div>
            <div>
              <label className="label">Comparison Culture</label>
              <input 
                type="text" 
                className="input" 
                value={content.otherCulture || 'Korean'} 
                onChange={(e) => updateBlock(id, { otherCulture: e.target.value })}
                placeholder="e.g. Korean, Japanese, Western"
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {content.items?.map((item) => (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 40px', gap: '1rem', alignItems: 'center' }}>
                <input 
                  className="input" 
                  value={item.label} 
                  onChange={(e) => handleUpdateItem(item.id, { label: e.target.value })}
                  placeholder="Aspect"
                />
                <textarea 
                  className="input" 
                  style={{ height: '60px', padding: '0.5rem' }}
                  value={item.chinese} 
                  onChange={(e) => handleUpdateItem(item.id, { chinese: e.target.value })}
                  placeholder="In Chinese Culture"
                />
                <textarea 
                  className="input" 
                  style={{ height: '60px', padding: '0.5rem' }}
                  value={item.other} 
                  onChange={(e) => handleUpdateItem(item.id, { other: e.target.value })}
                  placeholder={`In ${content.otherCulture || 'Other'} Culture`}
                />
                <button onClick={() => handleRemoveItem(item.id)} style={{ color: 'var(--error)' }}><Trash2 size={18} /></button>
              </div>
            ))}
            <button 
              onClick={handleAddItem}
              className="btn btn-secondary" 
              style={{ width: 'fit-content', fontSize: '0.875rem' }}
            >
              <Plus size={16} /> Add Comparison Aspect
            </button>
          </div>
        </div>
      ) : (
        <div>
          <h2 style={{ textAlign: 'center', fontSize: '1.5rem', marginBottom: '2rem' }}>Theme: {content.theme}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', background: 'var(--card-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ background: 'var(--primary)', color: 'white', padding: '1rem', textAlign: 'center', fontWeight: 700 }}>CHINESE CULTURE</div>
            <div style={{ background: 'var(--secondary)', color: 'white', padding: '1rem', textAlign: 'center', fontWeight: 700 }}>{content.otherCulture?.toUpperCase() || 'OTHER CULTURE'}</div>
            
            {content.items?.map((item, i) => (
              <React.Fragment key={item.id}>
                <div style={{ gridColumn: 'span 2', background: 'var(--primary-light)', padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textAlign: 'center', borderTop: i > 0 ? '1px solid var(--card-border)' : 'none' }}>
                  {item.label?.toUpperCase()}
                </div>
                <div style={{ background: 'var(--card-bg)', padding: '1.5rem', fontSize: '1rem', lineHeight: '1.6' }}>{item.chinese}</div>
                <div style={{ background: 'var(--card-bg)', padding: '1.5rem', fontSize: '1rem', lineHeight: '1.6' }}>{item.other}</div>
              </React.Fragment>
            ))}
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
