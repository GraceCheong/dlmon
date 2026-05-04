'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { FileText, Eye, Download, Printer, Search, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface Syllabus {
  id: string;
  courseId: string;
  courseTitle: string;
  level: string;
  updatedAt: string;
}

interface SyllabiClientProps {
  syllabi: Syllabus[];
}

export default function SyllabiClient({ syllabi }: SyllabiClientProps) {
  const { t, language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [exportingId, setExportingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return syllabi;
    return syllabi.filter((s) => s.courseTitle.toLowerCase().includes(q));
  }, [syllabi, searchTerm]);

  const handlePrint = (courseId: string) => {
    // Open the syllabus page in a new window and trigger its print dialog.
    const w = window.open(`/courses/${courseId}/syllabus`, '_blank');
    if (!w) {
      alert('팝업 차단을 해제해 주세요.');
      return;
    }
    w.addEventListener('load', () => {
      // Brief delay to ensure render finishes before printing.
      setTimeout(() => w.print(), 800);
    });
  };

  const handleDownload = (s: Syllabus) => {
    // PDF generation lives on the syllabus detail page (html2pdf needs the
    // rendered DOM). Open that page in a new tab so the user can use its
    // built-in "PDF 내보내기" button. A server-side PDF renderer would be
    // a larger lift and is out of scope for this milestone.
    setExportingId(s.id);
    window.open(`/courses/${s.courseId}/syllabus`, '_blank');
    // Reset the spinner shortly after so the button doesn't stay disabled.
    setTimeout(() => setExportingId(null), 500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4A5568' }}>{t.common.syllabi}</h1>
      </div>

      <div style={{ position: 'relative', maxWidth: '500px' }}>
        <Search
          size={18}
          style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0' }}
        />
        <input
          type="text"
          placeholder="강의 계획서 검색..."
          className="input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ paddingLeft: '3rem', background: 'white' }}
        />
      </div>

      <div className="card" style={{ overflow: 'hidden', padding: 0, border: 'none' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: 'var(--primary-light)', borderBottom: '2px solid white' }}>
            <tr>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-hover)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.common.table.title}</th>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-hover)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.common.table.level}</th>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-hover)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.common.table.updated}</th>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-hover)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>{t.common.table.actions}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid #F8FAFC', transition: 'all 0.3s' }} className="table-row-hover">
                <td style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.6rem', background: 'var(--accent-light)', color: '#E57373', borderRadius: '1rem' }}>
                      <FileText size={20} />
                    </div>
                    <span style={{ fontWeight: 700, color: '#4A5568' }}>{s.courseTitle}</span>
                  </div>
                </td>
                <td style={{ padding: '1.5rem' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.4rem 0.875rem',
                      borderRadius: '2rem',
                      background: s.level === 'Beginner' ? 'var(--primary-light)' : 'var(--accent-light)',
                      color: s.level === 'Beginner' ? 'var(--primary-hover)' : '#E57373',
                      fontWeight: 800,
                    }}
                  >
                    {language === 'ko'
                      ? s.level === 'Beginner'
                        ? '기초'
                        : s.level === 'Elementary'
                        ? '초급'
                        : s.level === 'Intermediate'
                        ? '중급'
                        : s.level === 'Advanced'
                        ? '고급'
                        : s.level
                      : s.level}
                  </span>
                </td>
                <td style={{ padding: '1.5rem', color: '#A0AEC0', fontSize: '0.9rem', fontWeight: 500 }}>
                  {new Date(s.updatedAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '1.5rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <Link
                      href={`/courses/${s.courseId}/syllabus`}
                      className="btn btn-secondary"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#718096' }}
                    >
                      <Eye size={16} /> 보기
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDownload(s)}
                      disabled={exportingId === s.id}
                      title="PDF 다운로드 페이지 열기"
                      className="btn"
                      style={{ padding: '0.6rem', borderRadius: '1rem', background: '#F8FAFC', color: '#718096', border: 'none', cursor: 'pointer' }}
                    >
                      {exportingId === s.id ? <Loader2 size={18} className="spin" /> : <Download size={18} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrint(s.courseId)}
                      title="인쇄"
                      className="btn"
                      style={{ padding: '0.6rem', borderRadius: '1rem', background: '#F8FAFC', color: '#718096', border: 'none', cursor: 'pointer' }}
                    >
                      <Printer size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '5rem', textAlign: 'center', color: '#CBD5E0', fontWeight: 600 }}>
                  {syllabi.length === 0 ? '생성된 강의 계획서가 없습니다.' : '검색 결과가 없습니다.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .table-row-hover:hover {
          background: #f0f9f4;
          transform: scale(1.002);
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
