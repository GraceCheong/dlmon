'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Loader2, Save, RefreshCw, BookOpen, AlignLeft, History } from 'lucide-react';
import AudienceSelector from '@/components/shared/AudienceSelector';

type Mode = 'vocabulary' | 'sentence';

interface VocabItem {
  chinese: string; pinyin: string; meaning: string;
  example?: string; examplePinyin?: string; exampleMeaning?: string;
}
interface SentenceItem {
  chinese: string; pinyin: string; meaning: string; grammarNote?: string;
}
type Item = VocabItem | SentenceItem;

interface HistoryItem {
  id: string;
  mode: Mode;
  topic: string;
  hskLevel: string | null;
  targetAudience: string | null;
  count: number;
  grammarPattern: string | null;
  context: string | null;
  content: string;
  createdAt: string;
}

const HSK_LEVELS = ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'];
const COUNTS = [5, 10, 15, 20];

export default function ChineseGeneratorClient() {
  const [mode, setMode] = useState<Mode>('vocabulary');
  const [topic, setTopic] = useState('');
  const [hskLevel, setHskLevel] = useState('HSK3');
  const [targetAudience, setTargetAudience] = useState('');
  const [count, setCount] = useState(10);
  const [grammarPattern, setGrammarPattern] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const parseHistoryItems = (content: string): Item[] => {
    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const res = await fetch('/api/ai/chinese-generator/history');
        const data = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(data.items)) setHistory(data.items);
      } finally {
        setHistoryLoading(false);
      }
    };
    void loadHistory();
  }, []);

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    setSavedId(null);
    try {
      const res = await fetch('/api/ai/chinese-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, topic, hskLevel, targetAudience, count, grammarPattern, context }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '생성에 실패했습니다.'); return; }
      setItems(data.items || []);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!items.length) return;
    setSaving(true);
    try {
      const res = await fetch('/api/ai/chinese-generator/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, topic, hskLevel, targetAudience, count, grammarPattern, context, items }),
      });
      const data = await res.json();
      if (res.ok) {
        setSavedId(data.item?.id || 'saved');
        if (data.item) {
          setHistory(prev => [{
            id: data.item.id,
            mode: data.item.mode,
            topic: data.item.topic,
            hskLevel: data.item.hskLevel,
            targetAudience: data.item.targetAudience,
            count: data.item.count,
            grammarPattern: data.item.grammarPattern,
            context: data.item.context,
            content: data.item.content,
            createdAt: data.item.createdAt,
          }, ...prev.filter(item => item.id !== data.item.id)]);
        }
      } else setError(data.error || '저장에 실패했습니다.');
    } catch {
      setError('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setMode(item.mode);
    setTopic(item.topic);
    setHskLevel(item.hskLevel || 'HSK3');
    setTargetAudience(item.targetAudience || '');
    setCount(item.count);
    setGrammarPattern(item.grammarPattern || '');
    setContext(item.context || '');
    setItems(parseHistoryItems(item.content));
    setSavedId(item.id);
    setError('');
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4A5568', marginBottom: '0.25rem' }}>중국어 생성기</h1>
        <p style={{ color: '#A0AEC0', fontSize: '0.95rem' }}>HSK 수준에 맞는 어휘와 예문을 AI로 생성합니다.</p>
      </div>

      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        {/* Mode selector */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {([['vocabulary', '어휘 생성', BookOpen], ['sentence', '예문 생성', AlignLeft]] as const).map(([v, label, Icon]) => (
            <button
              key={v}
              onClick={() => { setMode(v); setItems([]); }}
              style={{
                flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', fontWeight: 700,
                border: mode === v ? '2px solid var(--primary)' : '2px solid #E2E8F0',
                background: mode === v ? 'var(--primary-light)' : 'white',
                color: mode === v ? 'var(--primary)' : '#718096',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
            >
              <Icon size={18} />{label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px 120px', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#718096', marginBottom: '0.35rem' }}>주제 *</label>
            <input className="input" value={topic} onChange={e => setTopic(e.target.value)} placeholder="예: 음식, 여행, 직장생활" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#718096', marginBottom: '0.35rem' }}>대상 수준</label>
            <AudienceSelector value={targetAudience} onChange={setTargetAudience} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#718096', marginBottom: '0.35rem' }}>HSK 수준</label>
            <select className="input" value={hskLevel} onChange={e => setHskLevel(e.target.value)}>
              {HSK_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#718096', marginBottom: '0.35rem' }}>개수</label>
            <select className="input" value={count} onChange={e => setCount(Number(e.target.value))}>
              {COUNTS.map(c => <option key={c} value={c}>{c}개</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#718096', marginBottom: '0.35rem' }}>문법 패턴 (선택)</label>
            <input className="input" value={grammarPattern} onChange={e => setGrammarPattern(e.target.value)} placeholder="예: 把 구문, 被 수동태" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#718096', marginBottom: '0.35rem' }}>맥락/테마 (선택)</label>
            <input className="input" value={context} onChange={e => setContext(e.target.value)} placeholder="예: 카페에서의 대화, 비즈니스 회의" />
          </div>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={generate} disabled={loading || !topic.trim()} style={{ flex: 1 }}>
            {loading ? <><Loader2 size={18} className="spin" /> AI 생성 중...</> : <><Sparkles size={18} /> 생성하기</>}
          </button>
          {items.length > 0 && (
            <button className="btn btn-secondary" onClick={generate} disabled={loading} title="다시 생성">
              <RefreshCw size={18} />
            </button>
          )}
          {items.length > 0 && !savedId && (
            <button className="btn" onClick={save} disabled={saving} style={{ background: '#F0FDF4', color: '#166534', border: '1px solid #86EFAC' }}>
              {saving ? <Loader2 size={18} className="spin" /> : <><Save size={18} /> 저장</>}
            </button>
          )}
          {savedId && <span style={{ color: '#166534', fontWeight: 700, alignSelf: 'center', fontSize: '0.9rem' }}>✓ 저장됨</span>}
        </div>
      </div>

      {items.length > 0 && (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {mode === 'vocabulary'
            ? (items as VocabItem[]).map((item, i) => (
              <div key={i} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2D3748' }}>{item.chinese}</span>
                  <span style={{ color: '#718096', fontWeight: 600 }}>{item.pinyin}</span>
                  <span style={{ color: '#4A5568' }}>{item.meaning}</span>
                </div>
                {item.example && (
                  <div style={{ paddingTop: '0.5rem', borderTop: '1px solid #F1F5F9', color: '#4A5568', fontSize: '0.9rem' }}>
                    <span style={{ fontWeight: 600 }}>예: </span>{item.example}
                    {item.examplePinyin && <span style={{ color: '#718096', marginLeft: '0.5rem' }}>{item.examplePinyin}</span>}
                    {item.exampleMeaning && <div style={{ color: '#718096' }}>{item.exampleMeaning}</div>}
                  </div>
                )}
              </div>
            ))
            : (items as SentenceItem[]).map((item, i) => (
              <div key={i} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2D3748', marginBottom: '0.25rem' }}>{item.chinese}</div>
                <div style={{ color: '#718096', marginBottom: '0.25rem' }}>{item.pinyin}</div>
                <div style={{ color: '#4A5568' }}>{item.meaning}</div>
                {item.grammarNote && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#7C3AED', background: '#F5F3FF', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)' }}>
                    📌 {item.grammarNote}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4A5568', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <History size={18} /> 저장된 생성 이력
        </h2>
        {historyLoading ? (
          <div style={{ color: '#718096', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Loader2 size={16} className="spin" /> 불러오는 중...
          </div>
        ) : history.length === 0 ? (
          <p style={{ color: '#A0AEC0' }}>저장된 생성 이력이 없습니다.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {history.map(item => (
              <button
                key={item.id}
                onClick={() => loadHistoryItem(item)}
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: 'var(--radius-md)',
                  background: savedId === item.id ? '#F0FDF4' : '#FFFFFF',
                  padding: '0.85rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
                  <strong style={{ color: '#2D3748' }}>{item.topic}</strong>
                  <span style={{ color: '#A0AEC0', fontSize: '0.78rem' }}>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
                <div style={{ color: '#718096', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                  {item.mode === 'vocabulary' ? '어휘' : '예문'} · {item.hskLevel || 'HSK 미지정'} · {item.count}개
                  {item.grammarPattern ? ` · ${item.grammarPattern}` : ''}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
