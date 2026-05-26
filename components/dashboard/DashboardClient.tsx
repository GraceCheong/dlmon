'use client';

import React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Users,
  CheckCircle,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import CourseCard from './CourseCard';

interface Course {
  id: string;
  title: string;
  level: string;
  weeks: number;
  updatedAt: string;
  lessonCount: number;
  publishedCount: number;
  startDate?: string;
  endDate?: string;
}

interface DashboardClientProps {
  courses: Course[];
  stats: {
    totalCourses: number;
    publishedLessons: number;
    studentViews: number;
  };
}

export default function DashboardClient({ courses, stats }: DashboardClientProps) {
  const { t } = useLanguage();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Stats Summary */}
      <div className="grid-cols-3">
        <StatCard
          icon={<BookOpen size={24} />}
          label={t.dashboard.stats.totalCourses}
          value={stats.totalCourses.toString()}
          color="var(--primary)"
        />
        <StatCard
          icon={<CheckCircle size={24} />}
          label={t.dashboard.stats.publishedLessons}
          value={stats.publishedLessons.toString()}
          color="var(--secondary)"
        />
        <StatCard
          icon={<Users size={24} />}
          label={t.dashboard.stats.studentViews}
          value={stats.studentViews.toString()}
          color="#CE93D8"
        />
      </div>

      {/* Recent Courses */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4A5568' }}>{t.dashboard.recentCourses}</h2>
          <Link href="/courses" style={{ color: 'var(--primary)', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            {t.dashboard.viewAll} <ChevronRight size={16} />
          </Link>
        </div>

        <div className="grid-cols-3">
          {courses.map(course => (
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
          
          <Link href="/courses/new" className="card flex-center" style={{ 
            height: '100%',
            minHeight: '280px', 
            borderStyle: 'dashed', 
            borderWidth: '3px',
            background: 'transparent', 
            flexDirection: 'column', 
            gap: '1.25rem',
            color: '#CBD5E0',
            borderColor: '#E2E8F0'
          }}>
            <div style={{ padding: '1rem', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <Plus size={36} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{t.common.newCourse}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) {
  return (
    <div className="card" style={{ padding: '2rem', border: 'none', background: 'white' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ color: color, background: `${color}15`, padding: '0.75rem', borderRadius: '1.25rem', display: 'inline-flex' }}>
          {icon}
        </div>
      </div>
      <div>
        <div style={{ color: '#A0AEC0', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.25rem' }}>{label}</div>
        <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#4A5568' }}>{value}</div>
      </div>
    </div>
  );
}
