'use client';

import { useEditor } from '@/context/EditorContext';
import { Smartphone, Loader2, Link as LinkIcon, MessageCircle, Video, BookOpen } from 'lucide-react';
import { useState } from 'react';

interface VocabItem { word: string; pinyin: string; meaning: string; }
interface QAItem { question: string; answer: string; }

interface ImportContent {
  url?: string;
  sourceType?: 'video' | 'image/social';
  title?: string;
  transcript?: string;
  lectureText?: string;
  keyVocabulary?: VocabItem[];
  comprehensionQuestions?: QAItem[];
}

const STEPS = ['📥 영상 다운로드 중...', '🎙 음성 인식 중...', '🧠 강의 내용 변환 중...'];

export default function MediaImportBlock({ id, content }: { id: string; content: ImportContent }) {
  const { updateBlock } = useEditor();
  const [isImporting, setIsImporting] = useState(false);
  const [inputUrl, setInputUrl] = useState(content.url || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [step, setStep] = useState(0);

  const handleImport = async () => {
    if (!inputUrl.trim()) return;
    setIsImporting(true);
    setErrorMsg('');
    setStep(0);

    const isYT = /youtube\.com|youtu\.be/.test(inputUrl);
    if (isYT) {
      // Animate steps for YouTube
      const stepTimer = setInterval(() => setStep(s => Math.min(s + 1, 2)), 8000);
      try {
        const response = await fetch('/api/ai/import-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: inputUrl }),
        });
        clearInterval(stepTimer);
        if (response.ok) {
          const data = await response.json();
          updateBlock(id, { url: inputUrl, ...data });
        } else {
          const err = await response.json().catch(() => ({}));
          setErrorMsg(err.message || err.error || '미디어 추출에 실패했습니다.');
        }
      } catch (e) {
        clearInterval(stepTimer);
        setErrorMsg('서버와 통신하는 중 오류가 발생했습니다.');
      }
    } else {
      try {
        const response = await fetch('/api/ai/import-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: inputUrl }),
        });
        if (response.ok) {
          const data = await response.json();
          updateBlock(id, { url: inputUrl, ...data });
        } else {
          const err = await response.json().catch(() => ({}));
          setErrorMsg(err.message || err.error || '미디어 추출에 실패했습니다.');
        }
      } catch (e) {
        setErrorMsg('서버와 통신하는 중 오류가 발생했습니다.');
      }
    }
    setIsImporting(false);
  };

  if (!content.transcript) {
    return (
      <div style={{ width: '100%', margin: '1rem 0' }}>
        <div style={{ background: 'var(--primary-light)', border: '2px solid var(--primary)', borderRadius: 'var(--radius-lg)', padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--primary)' }}>
            <Video size={24} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>영상 미디어 임포트</h3>
          </div>
          <p style={{ color: '#4A5568', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            지원되는 YouTube 링크만 입력 가능합니다. AI가 자동으로 영상을 분석하여 음성을 추출하고 강의 자료로 변환합니다.
          </p>

          {isImporting && (
            <div style={{ background: 'white', borderRadius: 'var(--radius-md)', padding: '1rem 1.5rem', marginBottom: '1.25rem' }}>
              {STEPS.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0', color: i === step ? 'var(--primary)' : i < step ? '#A0AEC0' : '#E2E8F0', fontWeight: i === step ? 700 : 400, fontSize: '0.9rem' }}>
                  {i === step ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : i < step ? '✓' : '○'}
                  {s}
                </div>
              ))}
            </div>
          )}

          {errorMsg && <div style={{ padding: '0.75rem', background: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>{errorMsg}</div>}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <LinkIcon size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0' }} />
              <input type="text" placeholder="https://youtube.com/watch?v=..." className="input" value={inputUrl} onChange={e => setInputUrl(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
            </div>
            <button onClick={handleImport} disabled={isImporting || !inputUrl.trim()} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
              {isImporting ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> 처리 중...</> : 'AI 분석 시작'}
            </button>
          </div>
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-lg)', padding: '2rem', margin: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <MessageCircle size={24} color="#0EA5E9" />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2D3748' }}>{content.title}</h3>
        </div>
        <button onClick={() => updateBlock(id, { transcript: undefined })} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>다시 불러오기</button>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#4A5568', marginBottom: '0.75rem' }}>📄 원문 Transcript</h4>
          <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#2D3748', fontSize: '0.95rem' }}>
            {content.transcript}
          </div>
          {content.lectureText && (
            <>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#4A5568', margin: '1.25rem 0 0.75rem' }}>📚 강의 정제본</h4>
              <div style={{ background: '#F0FDF4', padding: '1.25rem', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#2D3748', fontSize: '0.95rem' }}>
                {content.lectureText}
              </div>
            </>
          )}
        </div>

        <div style={{ flex: '1 1 220px' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#4A5568', marginBottom: '0.75rem' }}>🔑 핵심 어휘</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {content.keyVocabulary?.map((v, i) => (
              <li key={i} style={{ background: '#F0FDF4', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #22C55E' }}>
                <span style={{ fontWeight: 800, color: '#166534' }}>{v.word}</span>
                <span style={{ color: '#15803D', fontSize: '0.85rem', marginLeft: '0.5rem' }}>[{v.pinyin}]</span>
                <div style={{ color: '#4A5568', fontSize: '0.85rem' }}>{v.meaning}</div>
              </li>
            ))}
          </ul>

          {content.comprehensionQuestions && content.comprehensionQuestions.length > 0 && (
            <>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#4A5568', margin: '1.25rem 0 0.75rem' }}>❓ 이해 확인 질문</h4>
              {content.comprehensionQuestions.map((q, i) => (
                <div key={i} style={{ background: '#EFF6FF', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 600, color: '#1E40AF', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Q: {q.question}</div>
                  <div style={{ color: '#3B82F6', fontSize: '0.85rem' }}>A: {q.answer}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
      <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#A0AEC0' }}>출처: {content.url}</div>
    </div>
  );
}
