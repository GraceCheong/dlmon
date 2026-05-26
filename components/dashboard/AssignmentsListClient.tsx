'use client';

import Link from 'next/link';
import { PlusCircle, FileText } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export interface AssignmentRow {
  id: string;
  title: string;
  type: string;
  dueDate: Date | null;
  courseTitle: string;
  lessonTitle: string;
  submissionCount: number;
  gradedCount: number;
}

export default function AssignmentsListClient({ assignments }: { assignments: AssignmentRow[] }) {
  const { t } = useLanguage();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4A5568' }}>{t.assignmentsPage.title}</h1>
          <p style={{ color: '#A0AEC0', fontSize: '0.95rem', marginTop: '0.25rem' }}>{t.assignmentsPage.subtitle}</p>
        </div>
        <Link href="/assignments/new" className="btn btn-primary" style={{ padding: '0.875rem 1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <PlusCircle size={20} style={{ marginRight: '0.5rem' }} /> {t.assignmentsPage.newButton}
        </Link>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {assignments.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#A0AEC0' }}>
            <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: '#4A5568' }}>{t.assignmentsPage.emptyTitle}</h3>
            <p>{t.assignmentsPage.emptyDesc}</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '1rem 1.5rem', color: '#718096', fontSize: '0.85rem', fontWeight: 700 }}>{t.assignmentsPage.table.title}</th>
                <th style={{ padding: '1rem 1.5rem', color: '#718096', fontSize: '0.85rem', fontWeight: 700 }}>{t.assignmentsPage.table.courseLesson}</th>
                <th style={{ padding: '1rem 1.5rem', color: '#718096', fontSize: '0.85rem', fontWeight: 700 }}>{t.assignmentsPage.table.type}</th>
                <th style={{ padding: '1rem 1.5rem', color: '#718096', fontSize: '0.85rem', fontWeight: 700 }}>{t.assignmentsPage.table.dueDate}</th>
                <th style={{ padding: '1rem 1.5rem', color: '#718096', fontSize: '0.85rem', fontWeight: 700 }}>{t.assignmentsPage.table.submissions}</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map(assignment => (
                <tr key={assignment.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <Link href={`/assignments/${assignment.id}`} style={{ fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>
                      {assignment.title}
                    </Link>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', color: '#4A5568', fontSize: '0.9rem' }}>
                    <div style={{ fontWeight: 600 }}>{assignment.courseTitle}</div>
                    <div style={{ color: '#A0AEC0', fontSize: '0.8rem' }}>{assignment.lessonTitle}</div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '1rem',
                      background: assignment.type === 'writing' ? '#E0F2FE' : '#F3E8FF',
                      color: assignment.type === 'writing' ? '#0EA5E9' : '#9333EA',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}>
                      {assignment.type === 'writing' ? t.assignmentsPage.typeWriting : t.assignmentsPage.typeSpeaking}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', color: '#718096', fontSize: '0.9rem' }}>
                    {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : t.assignmentsPage.noDueDate}
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, background: '#E2E8F0', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          background: 'var(--primary)',
                          width: assignment.submissionCount > 0 ? `${(assignment.gradedCount / assignment.submissionCount) * 100}%` : '0%',
                        }} />
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4A5568' }}>
                        {assignment.gradedCount} / {assignment.submissionCount}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
