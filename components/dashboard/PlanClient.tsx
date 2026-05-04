'use client';

import Link from 'next/link';
import { ChevronRight, FileText } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import CurriculumEditor from '@/components/dashboard/CurriculumEditor';

interface PlanClientProps {
  courseId: string;
  courseTitle: string;
  curriculum: any;
}

export default function PlanClient({ courseId, courseTitle, curriculum }: PlanClientProps) {
  const { t } = useLanguage();

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#A0AEC0', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            <Link href="/dashboard" style={{ color: 'inherit' }}>{t.common.dashboard}</Link>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--primary-hover)' }}>{courseTitle}</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#4A5568' }}>{t.plan.title}</h1>
          <p style={{ color: '#A0AEC0', marginTop: '0.25rem' }}>{t.plan.subtitle}</p>
        </div>
        <Link href={`/courses/${courseId}/syllabus`} className="btn" style={{ background: 'white', color: '#718096', border: '2px solid #F1F5F9', padding: '0.75rem 1.25rem' }}>
          <FileText size={18} /> {t.plan.viewSyllabus}
        </Link>
      </div>

      <CurriculumEditor courseId={courseId} initialData={curriculum} />
      
      <div style={{ height: '5rem' }} />
    </div>
  );
}
