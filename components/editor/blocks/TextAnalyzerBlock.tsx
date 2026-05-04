'use client';

import { useEditor } from '@/context/EditorContext';
import { Sparkles, Loader2, BookOpen } from 'lucide-react';
import { useState } from 'react';

interface Token {
  text: string;
  pinyin: string | null;
  hskLevel: number | null;
  meaning?: string;
}

const HSK_COLORS: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: '#DCFCE7', text: '#166534', label: 'HSK 1' },
  2: { bg: '#FEF9C3', text: '#854D0E', label: 'HSK 2' },
  3: { bg: '#FFEDD5', text: '#9A3412', label: 'HSK 3' },
  4: { bg: '#FEE2E2', text: '#991B1B', label: 'HSK 4' },
  5: { bg: '#F3E8FF', text: '#6B21A8', label: 'HSK 5' },
  6: { bg: '#E0E7FF', text: '#3730A3', label: 'HSK 6' },
};

export default function TextAnalyzerBlock({ id, content }: { id: string; content: { rawText?: string; tokens?: Token[] } }) {
  const { updateBlock } = useEditor();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [inputText, setInputText] = useState(content.rawText || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [tooltip, setTooltip] = useState<{ text: string; pinyin: string; hsk: number | null; meaning?: string } | null>(null);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setIsAnalyzing(true);
    setErrorMsg('');
    try {
      const response = await fetch('/api/ai/analyze-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });
      if (response.ok) {
        const data = await response.json();
        updateBlock(id, { rawText: inputText, tokens: data.tokens });
      } else {
        const err = await response.json().catch(() => ({}));
        setErrorMsg(err.error || '텍스트 분석에 실패했습니다.');
      }
    } catch {
      setErrorMsg('서버와 통신하는 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!content.tokens) {
    return (
      <div style={{ width: '100%', margin: '1rem 0' }}>
        <div style={{ background: 'var(--primary-light)', border: '2px solid var(--primary)', borderRadius: 'var(--radius-lg)', padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>
            <BookOpen size={24} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>HSK 텍스트 분석기</h3>
            <span style={{ fontSize: '0.75rem', background: 'var(--primary)', color: 'white', borderRadius: '1rem', padding: '0.2rem 0.75rem', fontWeight: 600 }}>AI + 사전 분석</span>
          </div>
          <textarea
            placeholder="중국어 텍스트를 입력하세요. AI가 단어 단위로 병음과 HSK 레벨을 분석합니다.&#10;예: 我今天真的很累，你可以帮我打搅吗？"
            className="input"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            style={{ minHeight: '150px', marginBottom: '1.5rem', resize: 'vertical', fontFamily: 'serif', fontSize: '1.1rem' }}
          />
          {errorMsg && <div style={{ padding: '0.75rem', background: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>{errorMsg}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleAnalyze} disabled={isAnalyzing || !inputText.trim()} className="btn btn-primary">
              {isAnalyzing ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Ollama 분석 중...</> : <><Sparkles size={18} /> AI 분석 시작</>}
            </button>
          </div>
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-lg)', padding: '2rem', margin: '1rem 0', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4A5568' }}>분석 결과</h3>
        <button onClick={() => updateBlock(id, { tokens: undefined })} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>다시 분석하기</button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', lineHeight: '3', alignItems: 'flex-end' }}>
        {content.tokens.map((token, index) => {
          const isChinese = /[\u4e00-\u9fa5]/.test(token.text);
          if (!isChinese) {
            return <span key={index} style={{ fontSize: '1.2rem', color: '#718096' }}>{token.text}</span>;
          }
          const colors = token.hskLevel ? HSK_COLORS[token.hskLevel] : { bg: '#F1F5F9', text: '#94A3B8', label: '?' };
          return (
            <span
              key={index}
              onMouseEnter={() => setTooltip({ text: token.text, pinyin: token.pinyin || '', hsk: token.hskLevel, meaning: token.meaning })}
              onMouseLeave={() => setTooltip(null)}
              style={{
                display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                padding: '0.15rem 0.5rem', borderRadius: '6px',
                background: colors.bg, color: colors.text,
                cursor: 'default', position: 'relative', transition: 'transform 0.15s',
              }}
              onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <span style={{ fontSize: '0.7rem', color: '#94A3B8', lineHeight: 1.2, fontFamily: 'sans-serif' }}>
                {token.pinyin || ' '}
              </span>
              <span style={{ fontSize: '1.3rem', fontWeight: 600, fontFamily: 'serif', lineHeight: 1.3 }}>{token.text}</span>
            </span>
          );
        })}
      </div>

      {/* Floating tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
          background: '#1A202C', color: 'white', padding: '0.75rem 1.25rem',
          borderRadius: '1rem', fontSize: '0.9rem', zIndex: 9999, whiteSpace: 'nowrap',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}>
          <span style={{ fontSize: '1.2rem', fontFamily: 'serif', marginRight: '0.5rem' }}>{tooltip.text}</span>
          <span style={{ color: '#98D8AA', marginRight: '0.5rem' }}>{tooltip.pinyin}</span>
          {tooltip.hsk && <span style={{ background: HSK_COLORS[tooltip.hsk].bg, color: HSK_COLORS[tooltip.hsk].text, padding: '0.1rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700 }}>HSK {tooltip.hsk}</span>}
          {tooltip.meaning && <span style={{ marginLeft: '0.5rem', color: '#CBD5E0' }}>{tooltip.meaning}</span>}
        </div>
      )}

      <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px dashed #CBD5E0', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#718096' }}>HSK 레벨 범례:</span>
        {[1, 2, 3, 4, 5, 6].map(level => {
          const c = HSK_COLORS[level];
          return <span key={level} style={{ background: c.bg, color: c.text, padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>{c.label}</span>;
        })}
        <span style={{ background: '#F1F5F9', color: '#94A3B8', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>?미분류</span>
      </div>
    </div>
  );
}
