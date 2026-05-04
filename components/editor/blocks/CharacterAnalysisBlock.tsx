'use client';

import { useEditor } from '@/context/EditorContext';
import { Type, Info, Layers } from 'lucide-react';
import { useState } from 'react';

interface Component {
  char: string;
  meaning: string;
}

export default function CharacterAnalysisBlock({ id, content }: { id: string, content: { character: string, meaning: string, components: Component[] } }) {
  const { updateBlock, isPreview } = useEditor();

  const handleAddComponent = () => {
    const newComp = { char: '', meaning: '' };
    updateBlock(id, { components: [...(content.components || []), newComp] });
  };

  const handleUpdateComponent = (index: number, updates: Partial<Component>) => {
    const newComponents = [...(content.components || [])];
    newComponents[index] = { ...newComponents[index], ...updates };
    updateBlock(id, { components: newComponents });
  };

  return (
    <div className="card" style={{ padding: '1.5rem', margin: '1rem 0', border: '1px solid var(--card-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', color: 'var(--primary)' }}>
        <Type size={20} />
        <span style={{ fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Character Analysis</span>
      </div>

      {!isPreview ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '1.5rem' }}>
            <div>
              <label className="label">Character</label>
              <input 
                type="text" 
                className="input" 
                style={{ fontSize: '2rem', textAlign: 'center', height: '80px' }}
                value={content.character || ''} 
                onChange={(e) => updateBlock(id, { character: e.target.value })}
                placeholder="字"
              />
            </div>
            <div>
              <label className="label">Primary Meaning</label>
              <textarea 
                className="input" 
                style={{ height: '80px', paddingTop: '1rem' }}
                value={content.meaning || ''} 
                onChange={(e) => updateBlock(id, { meaning: e.target.value })}
                placeholder="Enter the primary meaning or definition..."
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <label className="label">Components / Radicals</label>
              <button 
                onClick={handleAddComponent}
                style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}
              >
                + Add Component
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {content.components?.map((comp, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="input" 
                    style={{ width: '60px', textAlign: 'center' }}
                    value={comp.char}
                    onChange={(e) => handleUpdateComponent(i, { char: e.target.value })}
                    placeholder="部"
                  />
                  <input 
                    type="text" 
                    className="input" 
                    value={comp.meaning}
                    onChange={(e) => handleUpdateComponent(i, { meaning: e.target.value })}
                    placeholder="Component meaning..."
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '3rem', alignItems: 'center' }}>
          <div style={{ 
            width: '180px', 
            height: '180px', 
            background: 'var(--primary-light)', 
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '6rem',
            fontFamily: 'serif',
            color: 'var(--primary)',
            boxShadow: 'inset 0 0 0 1px var(--primary)'
          }}>
            {content.character}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Meaning: {content.meaning}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--secondary)', fontWeight: 600 }}>
                <Layers size={16} /> DECOMPOSITION
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {content.components?.map((comp, i) => (
                  <div key={i} className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--background)' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>{comp.char}</span>
                    <span style={{ fontSize: '0.875rem' }}>{comp.meaning}</span>
                  </div>
                ))}
              </div>
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
