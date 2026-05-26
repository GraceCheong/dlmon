'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  BookOpen, 
  ExternalLink,
  Trash2,
  Calendar,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface CourseCardProps {
  id: string;
  title: string;
  level: string;
  lessons: number;
  updated: string;
  published: number;
  progress: number;
  manageText: string;
  startDate?: string;
  endDate?: string;
}

export default function CourseCard({ id, title, level, lessons, updated, progress, manageText, startDate, endDate }: CourseCardProps) {
  const { t, language } = useLanguage();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  const duration = startDate && endDate ? `${formatDate(startDate)} ~ ${formatDate(endDate)}` : updated;
  
  const handleDiscard = async () => {
    setDeleting(true);
    setShowConfirm(false);
    try {
      const response = await fetch(`/api/courses/${id}/delete`, {
        method: 'DELETE',
      });
      if (response.ok) {
        window.location.reload();
      } else {
        setDeleting(false);
      }
    } catch (error) {
      console.error('Failed to delete course:', error);
      setDeleting(false);
    }
  };
  
  const levelMap: Record<string, string> = {
    'Beginner': '기초',
    'Elementary': '초급',
    'Intermediate': '중급',
    'Advanced': '고급'
  };

  const displayLevel = language === 'ko' ? (levelMap[level] || level) : level;

  return (
    <>
      <div className="card" style={{ padding: '2rem', position: 'relative', opacity: deleting ? 0.5 : 1, transition: 'opacity 0.3s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <span style={{ 
            fontSize: '0.75rem', 
            padding: '0.4rem 0.875rem', 
            borderRadius: '2rem', 
            background: level === 'Beginner' ? 'var(--primary-light)' : level === 'Intermediate' ? 'var(--accent-light)' : '#F3E5F5',
            color: level === 'Beginner' ? 'var(--primary-hover)' : level === 'Intermediate' ? '#E57373' : '#9C27B0',
            fontWeight: 800,
            letterSpacing: '0.02em'
          }}>
            {displayLevel}
          </span>
          <button 
            onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
            disabled={deleting}
            style={{ color: '#CBD5E0', background: 'transparent', border: 'none', cursor: 'pointer' }}
            onMouseOver={(e) => e.currentTarget.style.color = '#E57373'}
            onMouseOut={(e) => e.currentTarget.style.color = '#CBD5E0'}
          >
            <Trash2 size={18} />
          </button>
        </div>
        
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: '#4A5568' }}>{title}</h3>
        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.85rem', color: '#A0AEC0', marginBottom: '1.75rem', fontWeight: 500 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><BookOpen size={16} /> {lessons} {t.dashboard.weeks}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Calendar size={16} /> {duration}</span>
        </div>

        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.6rem', color: '#718096', fontWeight: 600 }}>
            <span>{t.dashboard.progress}</span>
            <span style={{ color: 'var(--primary)' }}>{progress}%</span>
          </div>
          <div style={{ width: '100%', height: '10px', background: '#F1F5F9', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--primary-hover))', borderRadius: '5px' }}></div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href={`/courses/${id}/plan`} className="btn btn-secondary" style={{ flex: 1, fontSize: '0.9rem', color: '#718096' }}>
            {manageText}
          </Link>
          <Link href={`/courses/${id}/syllabus`} className="btn btn-primary" style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
            <ExternalLink size={20} />
          </Link>
        </div>
      </div>

      {showConfirm && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh', 
          background: 'rgba(0,0,0,0.4)', 
          backdropFilter: 'blur(4px)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 9999 
        }} onClick={() => setShowConfirm(false)}>
          <div style={{ 
            background: 'white', 
            padding: '2.5rem', 
            borderRadius: '2rem', 
            maxWidth: '400px', 
            width: '90%', 
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            textAlign: 'center'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              background: '#FEE2E2', 
              color: '#EF4444', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 1.5rem' 
            }}>
              <Trash2 size={32} />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4A5568', marginBottom: '0.75rem' }}>{t.dashboard.confirmDelete}</h3>
            <p style={{ color: '#718096', marginBottom: '2rem', lineHeight: 1.5 }}>
              {t.dashboard.deleteWarning}
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, padding: '0.875rem' }}
                onClick={() => setShowConfirm(false)}
              >
                {t.dashboard.cancel}
              </button>
              <button
                className="btn"
                style={{ flex: 1, padding: '0.875rem', background: '#EF4444', color: 'white' }}
                onClick={handleDiscard}
              >
                {t.dashboard.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
