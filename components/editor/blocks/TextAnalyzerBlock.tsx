'use client';

import { useEditor } from '@/context/EditorContext';
import { Sparkles, Loader2, BookOpen, AlignLeft, PlusCircle, Save, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import AudienceSelector, { AUDIENCES } from '@/components/shared/AudienceSelector';

interface Token {
  text: string;
  pinyin: string | null;
  hskLevel: number | null;
  meaning?: string;
}

type GeneratorMode = 'vocabulary' | 'sentence';

interface HistoryItem {
  id: string;
  mode: GeneratorMode;
  topic: string;
  hskLevel: string | null;
  targetAudience: string | null;
  count: number | null;
  grammarPattern: string | null;
  context: string | null;
  content: string;
  createdAt: string;
}

interface VocabItem {
  chinese: string;
  pinyin: string;
  meaning: string;
  example?: string;
  examplePinyin?: string;
  exampleMeaning?: string;
}

interface SentenceItem {
  chinese: string;
  pinyin: string;
  meaning: string;
  grammarNote?: string;
}

type GeneratedItem = VocabItem | SentenceItem;

const HSK_COLORS: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: '#DCFCE7', text: '#166534', label: 'HSK 1' },
  2: { bg: '#FEF9C3', text: '#854D0E', label: 'HSK 2' },
  3: { bg: '#FFEDD5', text: '#9A3412', label: 'HSK 3' },
  4: { bg: '#FEE2E2', text: '#991B1B', label: 'HSK 4' },
  5: { bg: '#F3E8FF', text: '#6B21A8', label: 'HSK 5' },
  6: { bg: '#E0E7FF', text: '#3730A3', label: 'HSK 6' },
};

const AUDIENCE_VALUES = new Set<string>(AUDIENCES.map((audience) => audience.value));

function normalizeAudience(value: string | null | undefined): { audience: string; custom: string } {
  if (!value) return { audience: 'adult', custom: '' };
  if (AUDIENCE_VALUES.has(value)) return { audience: value, custom: '' };
  if (value.includes('중') || value.toLowerCase().includes('middle')) return { audience: 'middle_school', custom: '' };
  if (value.includes('고') || value.toLowerCase().includes('high')) return { audience: 'high_school', custom: '' };
  if (value.includes('대학') || value.toLowerCase().includes('university')) return { audience: 'university', custom: '' };
  if (value.includes('여행') || value.toLowerCase().includes('travel')) return { audience: 'travel', custom: '' };
  if (value.includes('비즈니스') || value.toLowerCase().includes('business')) return { audience: 'business', custom: '' };
  if (value.includes('성인') || value.includes('학습자') || value.toLowerCase().includes('adult')) return { audience: 'adult', custom: '' };
  return { audience: 'adult', custom: value };
}

export default function TextAnalyzerBlock({ id, content }: { id: string; content: { rawText?: string; tokens?: Token[]; generatedItems?: GeneratedItem[]; generatorMode?: GeneratorMode } }) {
  const { updateBlock, addBlock } = useEditor();
  const initialAudience = normalizeAudience('중국어 학습자');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [inputText, setInputText] = useState(content.rawText || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [tooltip, setTooltip] = useState<{ text: string; pinyin: string; hsk: number | null; meaning?: string } | null>(null);
  const [generatorMode, setGeneratorMode] = useState<GeneratorMode>(content.generatorMode || 'vocabulary');
  const [topic, setTopic] = useState(content.rawText?.slice(0, 40) || '');
  const [hskLevel, setHskLevel] = useState('HSK3');
  const [targetAudience, setTargetAudience] = useState(initialAudience.audience);
  const [customTargetAudience, setCustomTargetAudience] = useState(initialAudience.custom);
  const [count, setCount] = useState(10);
  const [grammarPattern, setGrammarPattern] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatorError, setGeneratorError] = useState('');
  const [generatedItems, setGeneratedItems] = useState<GeneratedItem[]>(content.generatedItems || []);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const effectiveTargetAudience = customTargetAudience.trim() || targetAudience;

  const handleAudienceChange = (value: string) => {
    setTargetAudience(value);
    setCustomTargetAudience('');
    setSavedId(null);
  };

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

  const handleGenerate = async () => {
    const sourceTopic = topic.trim() || inputText.trim() || content.rawText?.trim();
    if (!sourceTopic) return;
    setIsGenerating(true);
    setGeneratorError('');
    try {
      const response = await fetch('/api/ai/chinese-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: generatorMode,
          topic: sourceTopic,
          hskLevel,
          targetAudience: effectiveTargetAudience,
          count,
          grammarPattern,
          context: content.rawText || inputText,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setGeneratorError(data.error || '중국어 콘텐츠 생성에 실패했습니다.');
        return;
      }
      const items = Array.isArray(data.items) ? data.items : [];
      setGeneratedItems(items);
      setSavedId(null);
      setSaveError('');
      updateBlock(id, { generatedItems: items, generatorMode });
    } catch {
      setGeneratorError('생성 중 네트워크 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatGeneratedItems = () => {
    if (generatorMode === 'vocabulary') {
      return (generatedItems as VocabItem[])
        .map((item, index) => {
          const example = item.example ? `\n   예문: ${item.example}${item.examplePinyin ? ` (${item.examplePinyin})` : ''}${item.exampleMeaning ? ` - ${item.exampleMeaning}` : ''}` : '';
          return `${index + 1}. ${item.chinese} [${item.pinyin}] - ${item.meaning}${example}`;
        })
        .join('\n');
    }
    return (generatedItems as SentenceItem[])
      .map((item, index) => `${index + 1}. ${item.chinese}\n   ${item.pinyin}\n   ${item.meaning}${item.grammarNote ? `\n   문법: ${item.grammarNote}` : ''}`)
      .join('\n\n');
  };

  const handleSave = async () => {
    if (!generatedItems.length) return;
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch('/api/ai/chinese-generator/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: generatorMode,
          topic: topic.trim() || inputText.trim() || content.rawText?.trim() || '',
          hskLevel,
          targetAudience: effectiveTargetAudience,
          count,
          grammarPattern,
          context: content.rawText || inputText,
          items: generatedItems,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setSaveError(data.error || '저장 실패'); return; }
      setSavedId(data.item?.id || 'saved');
    } catch {
      setSaveError('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const res = await fetch('/api/ai/chinese-generator/history');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setHistoryError(data.error || '기록 불러오기 실패'); return; }
      setHistoryItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setHistoryError('기록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleLoadHistoryItem = (item: HistoryItem) => {
    setGeneratorMode(item.mode as GeneratorMode);
    setTopic(item.topic);
    if (item.hskLevel) setHskLevel(item.hskLevel);
    if (item.targetAudience) {
      const normalized = normalizeAudience(item.targetAudience);
      setTargetAudience(normalized.audience);
      setCustomTargetAudience(normalized.custom);
    }
    if (item.count) setCount(item.count);
    setGrammarPattern(item.grammarPattern ?? '');
    try {
      const items = JSON.parse(item.content) as GeneratedItem[];
      setGeneratedItems(items);
      updateBlock(id, { generatedItems: items, generatorMode: item.mode as GeneratorMode });
    } catch { /* keep current items if parse fails */ }
    setSavedId(item.id);
    setShowHistory(false);
  };

  const insertGeneratedTextBlock = () => {
    if (!generatedItems.length) return;
    addBlock('text', {
      text: `${generatorMode === 'vocabulary' ? '생성 어휘' : '생성 예문'}\n\n${formatGeneratedItems()}`,
    });
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

      <div style={{ marginTop: '1.5rem', borderTop: '1px solid #E2E8F0', paddingTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#4A5568', marginBottom: '0.25rem' }}>
              HSK 분석 기반 중국어 생성
            </h4>
            <p style={{ color: '#718096', fontSize: '0.82rem' }}>
              분석한 텍스트를 바탕으로 어휘나 예문을 생성하고 수업 블록으로 삽입합니다.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {([
              ['vocabulary', '단어 생성', BookOpen],
              ['sentence', '예문 생성', AlignLeft],
            ] as const).map(([mode, label, Icon]) => (
              <button
                key={mode}
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setGeneratorMode(mode);
                  setGeneratedItems([]);
                  setSavedId(null);
                  updateBlock(id, { generatedItems: [], generatorMode: mode });
                }}
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8rem',
                  background: generatorMode === mode ? 'var(--primary-light)' : 'white',
                  color: generatorMode === mode ? 'var(--primary)' : '#718096',
                  border: generatorMode === mode ? '1px solid var(--primary)' : '1px solid #E2E8F0',
                }}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setShowHistory(h => !h); if (!showHistory) loadHistory(); }}
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
            >
              <Clock size={15} /> 기록 {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 150px 100px', gap: '0.75rem', marginBottom: customTargetAudience ? '0.5rem' : '0.75rem' }}>
          <input
            className="input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="주제 입력 또는 분석 텍스트 자동 사용"
          />
          <select className="input" value={hskLevel} onChange={(e) => setHskLevel(e.target.value)}>
            {['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'].map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
          <AudienceSelector value={targetAudience} onChange={handleAudienceChange} />
          <select className="input" value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {[5, 10, 15, 20].map((value) => <option key={value} value={value}>{value}개</option>)}
          </select>
        </div>

        {customTargetAudience && (
          <input
            className="input"
            value={customTargetAudience}
            onChange={(e) => {
              setCustomTargetAudience(e.target.value);
              setSavedId(null);
            }}
            placeholder="기존 사용자 지정 대상"
            style={{ marginBottom: '0.75rem' }}
          />
        )}

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <input
            className="input"
            value={grammarPattern}
            onChange={(e) => setGrammarPattern(e.target.value)}
            placeholder="문법 패턴 선택 입력 (예: 把 구문, 了)"
            style={{ flex: 1 }}
          />
          <button type="button" className="btn btn-primary" onClick={handleGenerate} disabled={isGenerating || !(topic.trim() || inputText.trim() || content.rawText?.trim())}>
            {isGenerating ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> 생성 중...</> : <><Sparkles size={16} /> 생성</>}
          </button>
          {generatedItems.length > 0 && (
            <>
              <button type="button" className="btn btn-secondary" onClick={insertGeneratedTextBlock}>
                <PlusCircle size={16} /> 수업 블록 삽입
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSave}
                disabled={saving || !!savedId}
                style={{ color: savedId ? 'var(--primary)' : undefined }}
              >
                {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
                {savedId ? '저장됨' : '저장'}
              </button>
            </>
          )}
        </div>

        {generatorError && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '0.75rem', fontSize: '0.84rem' }}>
            {generatorError}
          </div>
        )}
        {saveError && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '0.75rem', fontSize: '0.84rem' }}>
            {saveError}
          </div>
        )}

        {generatedItems.length > 0 && (
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {generatorMode === 'vocabulary'
              ? (generatedItems as VocabItem[]).map((item, index) => (
                <div key={index} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2D3748' }}>{item.chinese}</span>
                    <span style={{ color: '#718096', fontWeight: 600 }}>{item.pinyin}</span>
                    <span style={{ color: '#4A5568' }}>{item.meaning}</span>
                  </div>
                  {item.example && <div style={{ marginTop: '0.4rem', color: '#718096', fontSize: '0.86rem' }}>예: {item.example}</div>}
                </div>
              ))
              : (generatedItems as SentenceItem[]).map((item, index) => (
                <div key={index} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '0.8rem' }}>
                  <div style={{ color: '#2D3748', fontWeight: 800 }}>{item.chinese}</div>
                  <div style={{ color: '#718096', fontSize: '0.86rem', marginTop: '0.2rem' }}>{item.pinyin}</div>
                  <div style={{ color: '#4A5568', marginTop: '0.2rem' }}>{item.meaning}</div>
                  {item.grammarNote && <div style={{ color: '#7C3AED', background: '#F5F3FF', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.5rem', marginTop: '0.4rem', fontSize: '0.82rem' }}>{item.grammarNote}</div>}
                </div>
              ))}
          </div>
        )}
        {showHistory && (
          <div style={{ marginTop: '1rem', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <div style={{ padding: '0.6rem 0.85rem', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '0.82rem', fontWeight: 700, color: '#4A5568' }}>
              저장된 생성 기록
            </div>
            {historyLoading ? (
              <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#718096', fontSize: '0.84rem' }}>
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> 불러오는 중...
              </div>
            ) : historyError ? (
              <div style={{ padding: '0.75rem 0.85rem', color: '#991B1B', fontSize: '0.84rem' }}>{historyError}</div>
            ) : historyItems.length === 0 ? (
              <div style={{ padding: '0.75rem 0.85rem', color: '#A0AEC0', fontSize: '0.84rem' }}>저장된 기록이 없습니다.</div>
            ) : (
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {historyItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleLoadHistoryItem(item)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '0.65rem 0.85rem',
                      background: 'white', border: 'none', borderBottom: '1px solid #F1F5F9',
                      cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                  >
                    <span style={{ fontSize: '0.84rem', color: '#2D3748', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.topic || '(주제 없음)'}
                    </span>
                    <span style={{ fontSize: '0.76rem', color: '#A0AEC0', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {item.mode === 'vocabulary' ? '단어' : '예문'} · {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
