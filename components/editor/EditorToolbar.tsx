'use client';

import { useEditor } from '@/context/EditorContext';
import { useState, useEffect } from 'react';
import { Eye, Save, Send, ChevronLeft, Check, Download, Sparkles, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

export default function EditorToolbar({ lessonId, courseId, title }: { lessonId: string; courseId: string; title: string }) {
  const { t } = useLanguage();
  const { blocks, isPreview, setIsPreview } = useEditor();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState('draft');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [ollamaOnline, setOllamaOnline] = useState<boolean | null>(null);
  const router = useRouter();

  // Check Ollama status on mount
  useEffect(() => {
    fetch('/api/ai/ollama-status')
      .then(r => r.json())
      .then(d => setOllamaOnline(d.available))
      .catch(() => setOllamaOnline(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const response = await fetch(`/api/lessons/${lessonId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks }),
      });
      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const response = await fetch(`/api/lessons/${lessonId}/publish`, { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setStatus(data.status);
        if (data.status === 'published') {
          window.open(`/p/${data.slug}`, '_blank');
        }
      }
    } catch (e) {
      console.error('Publish failed:', e);
    } finally {
      setPublishing(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('editor-canvas-content');
      if (!element) { setExportingPdf(false); return; }
      const options: any = {
        margin: [10, 10, 10, 10],
        filename: `${title.substring(0, 30)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };
      await (html2pdf() as any).from(element).set(options).save();
    } catch (e) {
      console.error('PDF export failed:', e);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <header style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: '2rem', background: 'var(--card-bg)', padding: '1rem 1.5rem',
      borderRadius: 'var(--radius-lg)', border: '1px solid var(--card-border)',
      position: 'sticky', top: '20px', zIndex: 100, boxShadow: 'var(--card-shadow)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href={`/courses/${courseId}/plan`} style={{ color: 'var(--secondary)' }}>
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{title}</h1>
          <span style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>
            {isPreview ? t.editor.exitPreview : t.editor.lessonEditor}
          </span>
        </div>
        {/* Ollama status dot */}
        {ollamaOnline !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: ollamaOnline ? '#22C55E' : '#94A3B8', fontWeight: 600 }}>
            {ollamaOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            AI {ollamaOnline ? 'ON' : 'OFF'}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        {saved && (
          <span style={{ fontSize: '0.875rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Check size={16} /> {t.editor.saved}
          </span>
        )}

        <button
          className={`btn ${isPreview ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.875rem' }}
          onClick={() => setIsPreview(!isPreview)}
        >
          <Eye size={18} /> {isPreview ? t.common.back : t.common.preview}
        </button>

        {!isPreview && (
          <>
            <button className="btn btn-secondary" style={{ fontSize: '0.875rem' }} onClick={handleSave} disabled={saving}>
              {saving ? t.common.loading : <><Save size={18} /> {t.editor.saveDraft}</>}
            </button>

            <button className="btn" style={{ fontSize: '0.875rem', background: '#F8FAFC', color: '#718096', border: '1px solid #E2E8F0' }} onClick={handleExportPdf} disabled={exportingPdf} title="PDF 다운로드">
              {exportingPdf ? <><Download size={18} /> 생성 중...</> : <><Download size={18} /> PDF</>}
            </button>

            <button className="btn btn-primary" style={{ fontSize: '0.875rem' }} onClick={handlePublish} disabled={publishing}>
              <Send size={18} /> {publishing ? t.common.loading : status === 'published' ? t.common.unpublish : t.common.publish}
            </button>
          </>
        )}
      </div>
    </header>
  );
}
