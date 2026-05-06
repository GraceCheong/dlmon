'use client';

import { useEditor } from '@/context/EditorContext';
import { useLanguage } from '@/context/LanguageContext';
import { HelpCircle, Plus, Trash2, CheckCircle2 } from 'lucide-react';

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

export default function QuizBlock({ id, content }: { id: string, content: { question: string, options: Option[] } }) {
  const { updateBlock } = useEditor();
  const { t } = useLanguage();

  const handleAddOption = () => {
    const newOption = { id: Date.now().toString(), text: '', isCorrect: false };
    updateBlock(id, { options: [...(content.options || []), newOption] });
  };

  const handleUpdateOption = (optId: string, updates: Partial<Option>) => {
    const newOptions = content.options.map(opt => 
      opt.id === optId ? { ...opt, ...updates } : opt
    );
    updateBlock(id, { options: newOptions });
  };

  const handleRemoveOption = (optId: string) => {
    updateBlock(id, { options: content.options.filter(opt => opt.id !== optId) });
  };

  return (
    <div className="card" style={{ padding: '1.5rem', margin: '1rem 0', border: '1px solid var(--card-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', color: 'var(--primary)' }}>
        <HelpCircle size={20} />
        <span style={{ fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Quiz Block</span>
      </div>

      <input
        type="text"
        value={content.question || ''}
        onChange={(e) => updateBlock(id, { question: e.target.value })}
        placeholder={t.editor.placeholders.question}
        style={{
          width: '100%',
          border: 'none',
          outline: 'none',
          fontSize: '1.125rem',
          fontWeight: 500,
          background: 'transparent',
          color: 'var(--foreground)',
          marginBottom: '1.5rem'
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {content.options?.map((option) => (
          <div key={option.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              onClick={() => handleUpdateOption(option.id, { isCorrect: !option.isCorrect })}
              style={{ color: option.isCorrect ? 'var(--success)' : 'var(--card-border)', cursor: 'pointer' }}
            >
              <CheckCircle2 size={24} />
            </button>
            <input
              type="text"
              value={option.text}
              onChange={(e) => handleUpdateOption(option.id, { text: e.target.value })}
              placeholder={t.editor.placeholders.option}
              className="input"
              style={{ flex: 1, padding: '0.5rem 0.75rem' }}
            />
            <button onClick={() => handleRemoveOption(option.id)} style={{ color: 'var(--error)' }}>
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        
        <button 
          onClick={handleAddOption}
          className="btn btn-secondary" 
          style={{ width: 'fit-content', marginTop: '0.5rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={16} /> Add Option
        </button>
      </div>
    </div>
  );
}
