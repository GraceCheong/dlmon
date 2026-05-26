'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Plus,
  Search,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import CourseCard from './CourseCard';
import TemplatesClient from './TemplatesClient';
import MarketTemplatesClient from './MarketTemplatesClient';

interface Course {
  id: string;
  title: string;
  level: string;
  weeks: number;
  updatedAt: string;
  startDate?: string;
  endDate?: string;
  lessonCount: number;
  publishedCount: number;
}

interface Template {
  id: string;
  title: string;
  description: string | null;
  type: string;
  targetAudience: string | null;
  hskLevel: string | null;
  sourceType: string;
  updatedAt: string;
  isPublished?: boolean;
}

interface MyCoursesClientProps {
  courses: Course[];
  initialTemplates?: Template[];
}

export default function MyCoursesClient({ courses, initialTemplates = [] }: MyCoursesClientProps) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<'courses' | 'templates' | 'market'>('courses');
  const [filter, setFilter] = useState<'all' | 'ongoing' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const myTemplates = initialTemplates.filter((t) => t.sourceType !== 'copied');
  const marketTemplates = initialTemplates.filter((t) => t.sourceType === 'copied');

  const filteredCourses = courses.filter(course => {
    // Search filter (title contains query, case-insensitive)
    const q = searchTerm.trim().toLowerCase();
    if (q && !course.title.toLowerCase().includes(q)) return false;
    if (filter === 'all') return true;
    const now = new Date();
    const end = course.endDate ? new Date(course.endDate) : null;
    if (filter === 'ongoing') return !end || end >= now;
    if (filter === 'completed') return end && end < now;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page header with tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0', background: '#F8FAFC', borderRadius: '0.75rem', padding: '0.25rem' }}>
          <button
            onClick={() => setTab('courses')}
            style={{
              padding: '0.55rem 1.25rem', borderRadius: '0.5rem', border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
              background: tab === 'courses' ? 'white' : 'transparent',
              color: tab === 'courses' ? 'var(--primary-hover)' : '#A0AEC0',
              boxShadow: tab === 'courses' ? '0 2px 6px rgba(0,0,0,0.07)' : 'none',
            }}
          >
            {t.common.myCourses}
          </button>
          <button
            onClick={() => setTab('templates')}
            style={{
              padding: '0.55rem 1.25rem', borderRadius: '0.5rem', border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
              background: tab === 'templates' ? 'white' : 'transparent',
              color: tab === 'templates' ? 'var(--primary-hover)' : '#A0AEC0',
              boxShadow: tab === 'templates' ? '0 2px 6px rgba(0,0,0,0.07)' : 'none',
            }}
          >
            내 템플릿
          </button>
          <button
            onClick={() => setTab('market')}
            style={{
              padding: '0.55rem 1.25rem', borderRadius: '0.5rem', border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
              background: tab === 'market' ? 'white' : 'transparent',
              color: tab === 'market' ? 'var(--primary-hover)' : '#A0AEC0',
              boxShadow: tab === 'market' ? '0 2px 6px rgba(0,0,0,0.07)' : 'none',
            }}
          >
            마켓 템플릿{marketTemplates.length > 0 && (
              <span style={{ marginLeft: '0.35rem', background: 'var(--primary)', color: 'white', borderRadius: '2rem', fontSize: '0.72rem', padding: '0.05rem 0.45rem', fontWeight: 700 }}>{marketTemplates.length}</span>
            )}
          </button>
        </div>
        {tab === 'courses' && (
          <Link href="/courses/new" className="btn btn-primary" style={{ padding: '0.875rem 1.5rem' }}>
            <Plus size={20} /> {t.common.newCourse}
          </Link>
        )}
      </div>

      {tab === 'market' ? (
        <MarketTemplatesClient initialTemplates={marketTemplates} />
      ) : tab === 'templates' ? (
        <TemplatesClient initialTemplates={myTemplates} />
      ) : (
        <>
      {/* Filters & Search */}
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0' }} />
          <input
            type="text"
            placeholder={t.courses.searchPlaceholder}
            className="input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '3rem', background: 'white', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
          />
        </div>
        <select 
          className="input" 
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | 'ongoing' | 'completed')}
          style={{ width: '180px', background: 'white', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', fontWeight: 600, color: '#718096' }}
        >
          <option value="all">모든 강좌</option>
          <option value="ongoing">진행 중</option>
          <option value="completed">종료됨</option>
        </select>
      </div>

      <div className="grid-cols-3">
        {filteredCourses.map(course => (
          <CourseCard 
            key={course.id}
            id={course.id}
            title={course.title} 
            level={course.level} 
            lessons={course.weeks} 
            updated={new Date(course.updatedAt).toLocaleDateString()} 
            published={course.publishedCount}
            progress={course.publishedCount > 0 ? Math.round((course.publishedCount / (course.weeks || 1)) * 100) : 0}
            manageText={t.dashboard.manage}
            startDate={course.startDate}
            endDate={course.endDate}
          />
        ))}

        {courses.length === 0 && (
          <div style={{ 
            gridColumn: 'span 3', 
            textAlign: 'center', 
            padding: '6rem 2rem', 
            background: 'var(--primary-light)', 
            borderRadius: 'var(--radius-xl)', 
            border: '3px dashed white' 
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>✨</div>
            <p style={{ color: '#718096', marginBottom: '2rem', fontSize: '1.1rem', fontWeight: 600 }}>아직 등록된 강좌가 없어요. 새로운 수업을 시작해 볼까요?</p>
            <Link href="/courses/new" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
              새 강좌 만들기
            </Link>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
