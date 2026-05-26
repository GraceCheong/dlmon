'use client';

import { useEditor } from '@/context/EditorContext';
import { useState, useEffect } from 'react';
import { Eye, Save, Send, ChevronLeft, Check, Download, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

export default function EditorToolbar({ lessonId, courseId, title, initialStatus }: { lessonId: string; courseId: string; title: string; initialStatus?: string }) {
  const { t } = useLanguage();
  const { blocks, isPreview, setIsPreview, setIsExporting } = useEditor();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [status, setStatus] = useState(initialStatus || 'draft');
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
    if (saving) return; // prevent duplicate saves
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      // Phase 3: switched from POST /api/lessons/:id/save (no ownership check)
      // to PATCH /api/lessons/:id/blocks (enforces ownership; returns persisted blocks).
      const response = await fetch(`/api/lessons/${lessonId}/blocks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks, status: 'draft' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSaveError(data.error || '임시 저장에 실패했습니다.');
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      // Refresh server data so the page reflects the new updatedAt.
      router.refresh();
    } catch (e) {
      console.error('Save failed:', e);
      setSaveError('네트워크 오류로 임시 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setPublishError(null);
    try {
      const response = await fetch(`/api/lessons/${lessonId}/publish`, { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPublishError(data.error || '배포에 실패했습니다.');
        return;
      }
      setStatus(data.status);
      if (data.status === 'published') {
        window.open(`/p/${encodeURIComponent(data.slug)}`, '_blank');
      }
    } catch (e) {
      console.error('Publish failed:', e);
      setPublishError('네트워크 오류로 배포에 실패했습니다.');
    } finally {
      setPublishing(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    const element = document.getElementById('editor-canvas-content');
    if (!element) { setExportingPdf(false); return; }

    // Switch to preview + exporting mode so edit controls are hidden and
    // PDF blocks are expanded to show all pages inline.
    const wasPreview = isPreview;
    setIsPreview(true);
    setIsExporting(true);

    // Wait for React to re-render and for PDF.js pages to finish rendering.
    await new Promise(r => setTimeout(r, 1800));

    // YouTube iframes don't render in html2canvas. Swap them to the static
    // PDF fallback divs (thumbnail + title + link) before capture, then restore.
    const embeds = Array.from(element.querySelectorAll<HTMLElement>('[data-yt-embed]'));
    const fallbacks = Array.from(element.querySelectorAll<HTMLElement>('[data-yt-pdf-fallback]'));
    embeds.forEach(el => { el.style.display = 'none'; });
    fallbacks.forEach(el => { el.style.display = 'block'; });

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      interface Html2PdfInstance { from(el: HTMLElement): this; set(o: unknown): this; save(): Promise<void>; }
      const options = {
        margin: [10, 15, 10, 15],
        filename: `${title.substring(0, 30)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: false, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['img', 'canvas', '.pdf-no-break'] }
      };
      await (html2pdf() as unknown as Html2PdfInstance).from(element).set(options).save();
    } catch (e) {
      console.error('PDF export failed:', e);
    } finally {
      // Always restore regardless of success or failure
      embeds.forEach(el => { el.style.display = ''; });
      fallbacks.forEach(el => { el.style.display = ''; });
      setIsExporting(false);
      setIsPreview(wasPreview);
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
            <Check size={16} /> {t.editor.savedDraft}
          </span>
        )}
        {saveError && (
          <span
            style={{ fontSize: '0.875rem', color: '#991B1B', fontWeight: 600 }}
            title={saveError}
          >
            ⚠ {saveError}
          </span>
        )}
        {publishError && (
          <span
            style={{ fontSize: '0.875rem', color: '#991B1B', fontWeight: 600 }}
            title={publishError}
          >
            ⚠ {publishError}
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
              {saving ? <><Save size={18} /> {t.editor.saving}</> : <><Save size={18} /> {t.editor.saveDraft}</>}
            </button>

            <button className="btn" style={{ fontSize: '0.875rem', background: '#F8FAFC', color: '#718096', border: '1px solid #E2E8F0' }} onClick={handleExportPdf} disabled={exportingPdf} title="PDF 다운로드">
              {exportingPdf ? <><Download size={18} /> {t.editor.generatingPdf}</> : <><Download size={18} /> PDF</>}
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
