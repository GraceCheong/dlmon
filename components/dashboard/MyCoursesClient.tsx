'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Plus,
  Search,
  Filter
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import CourseCard from './CourseCard';

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

interface MyCoursesClientProps {
  courses: Course[];
}

export default function MyCoursesClient({ courses }: MyCoursesClientProps) {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<'all' | 'ongoing' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4A5568' }}>{t.common.myCourses}</h1>
        <Link href="/courses/new" className="btn btn-primary" style={{ padding: '0.875rem 1.5rem' }}>
          <Plus size={20} /> {t.common.newCourse}
        </Link>
      </div>

      {/* Filters & Search */}
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0' }} />
          <input
            type="text"
            placeholder="강좌 검색..."
            className="input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '3rem', background: 'white', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
          />
        </div>
        <select 
          className="input" 
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
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
    </div>
  );
}
