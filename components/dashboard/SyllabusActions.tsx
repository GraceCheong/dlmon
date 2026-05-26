'use client';

import { useState } from 'react';
import { Printer, Download, Save, Check, Loader2, Edit3, X } from 'lucide-react';
import MarkdownRenderer from '@/components/dashboard/MarkdownRenderer';

interface Props {
  courseId: string;
  initialContent: string;
}

/**
 * SyllabusActions now owns both the rendered syllabus body and the toolbar
 * (Print / PDF / Edit / Save). The parent page passes in the initial markdown.
 *
 * - Print: window.print() (unchanged)
 * - PDF: html2pdf.js — captures the current rendered DOM
 * - Edit: toggles an inline textarea over the rendered view
 * - Save: PATCH /api/syllabus/[courseId] — actually persists now
 */
export default function SyllabusActions({ courseId, initialContent }: Props) {
  const [content, setContent] = useState(initialContent);
  const [draft, setDraft] = useState(initialContent);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('syllabus-card');
      if (!element) {
        setError('미리보기 영역을 찾지 못했습니다.');
        return;
      }
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `Syllabus_${courseId}_${Date.now()}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };
      await html2pdf().from(element).set(opt).save();
    } catch {
      setError('PDF 생성 실패');
    } finally {
      setExporting(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/syllabus/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || '저장에 실패했습니다.');
        return;
      }
      setContent(draft);
      setEditing(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } catch {
      setError('네트워크 오류로 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setDraft(content);
    setEditing(false);
    setError(null);
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {savedFlash && (
          <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Check size={16} /> 저장되었습니다
          </span>
        )}

        <button
          className="btn"
          onClick={() => window.print()}
          disabled={editing}
          style={{ background: 'white', color: '#718096', border: '2px solid #F1F5F9' }}
        >
          <Printer size={18} /> 인쇄하기
        </button>

        <button
          className="btn"
          onClick={handleExportPDF}
          disabled={exporting || editing}
          style={{ background: 'white', color: '#718096', border: '2px solid #F1F5F9' }}
        >
          {exporting ? <><Loader2 size={18} className="spin" /> 생성 중...</> : <><Download size={18} /> PDF 내보내기</>}
        </button>

        {!editing ? (
          <button className="btn btn-primary" onClick={() => setEditing(true)}>
            <Edit3 size={18} /> 수정하기
          </button>
        ) : (
          <>
            <button className="btn" onClick={cancelEdit} disabled={saving} style={{ background: 'white', color: '#718096', border: '2px solid #F1F5F9' }}>
              <X size={18} /> 취소
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 size={18} className="spin" /> 저장 중...</> : <><Save size={18} /> 저장</>}
            </button>
          </>
        )}
      </div>

      {error && (
        <div
          style={{
            background: '#FEF2F2',
            color: '#991B1B',
            padding: '0.75rem 1rem',
            borderRadius: '0.75rem',
            fontWeight: 600,
            marginTop: '1rem',
          }}
        >
          {error}
        </div>
      )}

      <div id="syllabus-card" className="card" style={{ padding: '4rem', background: 'white', border: 'none', boxShadow: '0 20px 60px rgba(0,0,0,0.05)', minHeight: '1000px', marginTop: '2.5rem' }}>
        {editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={saving}
            spellCheck={false}
            style={{
              width: '100%',
              minHeight: '900px',
              fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              padding: '1rem',
              border: '2px solid var(--primary-light)',
              borderRadius: '0.75rem',
              resize: 'vertical',
              background: '#FAFAFA',
              color: '#2D3748',
            }}
          />
        ) : (
          <MarkdownRenderer content={content} />
        )}
      </div>

      <style jsx>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
