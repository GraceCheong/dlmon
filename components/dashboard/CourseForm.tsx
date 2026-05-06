'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  ArrowRight, 
  Target, 
  Users, 
  Calendar, 
  Layers,
  Award,
  Type
} from 'lucide-react';

import { useLanguage } from '@/context/LanguageContext';

export default function CourseForm() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: 'Beginner',
    goals: '',
    weeks: 15,
    type: 'Language',
    style: 'Communicative',
    evaluation: 'Project-based',
    keywords: '',
    startDate: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGenerateError('');

    try {
      const response = await fetch('/api/courses/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, language }),
      });

      const data = await response.json();
      if (data.id) {
        router.push(`/courses/${data.id}/plan`);
        return; // keep loading=true while navigating
      }
      setGenerateError(data.error || '강좌 생성에 실패했습니다. 다시 시도해 주세요.');
    } catch {
      setGenerateError('서버와 통신하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: '3rem', maxWidth: '850px', margin: '0 auto', border: 'none', boxShadow: '0 20px 60px rgba(152, 216, 170, 0.15)' }}>
      <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', padding: '1.25rem', background: 'var(--primary-light)', borderRadius: '2rem', color: 'var(--primary)', marginBottom: '1.5rem', boxShadow: '0 8px 20px rgba(152, 216, 170, 0.1)' }}>
          <Sparkles size={40} />
        </div>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#4A5568' }}>{t.form.assistant}</h2>
        <p style={{ color: '#A0AEC0', fontSize: '1.1rem', marginTop: '0.5rem' }}>{t.form.assistantDesc}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Title */}
        <div style={{ gridColumn: 'span 2' }}>
          <label className="label">{t.form.courseTitle}</label>
          <input 
            type="text" 
            className="input" 
            placeholder={t.form.courseTitlePlaceholder} 
            required
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            style={{ padding: '1rem 1.5rem', fontSize: '1.1rem' }}
          />
        </div>

        {/* Description */}
        <div style={{ gridColumn: 'span 2' }}>
          <label className="label">{t.form.description}</label>
          <textarea 
            className="input" 
            style={{ minHeight: '120px', resize: 'vertical', padding: '1rem 1.5rem' }}
            placeholder={t.form.descriptionPlaceholder}
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
        </div>

        {/* Level & Weeks */}
        <div>
          <label className="label"><Users size={16} style={{ marginRight: '8px' }} /> {t.form.level}</label>
          <select 
            className="input"
            value={formData.level}
            onChange={(e) => setFormData({...formData, level: e.target.value})}
            style={{ padding: '1rem 1.25rem', appearance: 'none', background: 'white url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23CBD5E0\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E") no-repeat right 1rem center' }}
          >
            <option value="Beginner">기초 (Beginner)</option>
            <option value="Elementary">초급 (Elementary)</option>
            <option value="Intermediate">중급 (Intermediate)</option>
            <option value="Advanced">고급 (Advanced)</option>
          </select>
        </div>

        <div>
          <label className="label"><Calendar size={16} style={{ marginRight: '8px' }} /> {t.form.weeks}</label>
          <input 
            type="number" 
            className="input" 
            max={20} 
            min={1} 
            value={formData.weeks}
            onChange={(e) => setFormData({...formData, weeks: parseInt(e.target.value)})}
            style={{ padding: '1rem 1.25rem' }}
          />
        </div>

        {/* Start Date */}
        <div style={{ gridColumn: 'span 2' }}>
          <label className="label"><Calendar size={16} style={{ marginRight: '8px' }} /> 강의 시작일</label>
          <input 
            type="date" 
            className="input"
            value={formData.startDate}
            onChange={(e) => setFormData({...formData, startDate: e.target.value})}
            style={{ padding: '1rem 1.25rem' }}
          />
        </div>

        {/* Class Type & Style */}
        <div>
          <label className="label"><Layers size={16} style={{ marginRight: '8px' }} /> {t.form.type}</label>
          <select 
            className="input"
            value={formData.type}
            onChange={(e) => setFormData({...formData, type: e.target.value})}
            style={{ padding: '1rem 1.25rem', appearance: 'none', background: 'white url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23CBD5E0\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E") no-repeat right 1rem center' }}
          >
            <option value="Language">어학 (Language)</option>
            <option value="Literature">문학 (Literature)</option>
            <option value="Culture">문화 (Culture)</option>
            <option value="Mixed">일반 (Mixed)</option>
          </select>
        </div>

        <div>
          <label className="label"><Type size={16} style={{ marginRight: '8px' }} /> {t.form.style}</label>
          <select 
            className="input"
            value={formData.style}
            onChange={(e) => setFormData({...formData, style: e.target.value})}
            style={{ padding: '1rem 1.25rem', appearance: 'none', background: 'white url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23CBD5E0\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E") no-repeat right 1rem center' }}
          >
            <option value="Communicative">의사소통 중심 (Communicative)</option>
            <option value="Traditional">문법 중심 (Traditional)</option>
            <option value="Project-Based">프로젝트 중심 (Project-Based)</option>
          </select>
        </div>

        {/* Goals */}
        <div style={{ gridColumn: 'span 2' }}>
          <label className="label"><Target size={16} style={{ marginRight: '8px' }} /> {t.form.goals}</label>
          <textarea 
            className={loading ? "input loading-animation" : "input"}
            style={{ minHeight: '100px', padding: '1rem 1.5rem' }}
            placeholder={t.form.goalsPlaceholder}
            value={formData.goals}
            onChange={(e) => setFormData({...formData, goals: e.target.value})}
          />
        </div>

        {/* Evaluation */}
        <div style={{ gridColumn: 'span 2' }}>
          <label className="label"><Award size={16} style={{ marginRight: '8px' }} /> {t.form.evaluation}</label>
          <input 
            type="text" 
            className="input" 
            placeholder={t.form.evaluationPlaceholder} 
            value={formData.evaluation}
            onChange={(e) => setFormData({...formData, evaluation: e.target.value})}
            style={{ padding: '1rem 1.5rem' }}
          />
        </div>
      </div>

      {generateError && (
        <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', marginTop: '1.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
          {generateError}
        </div>
      )}

      <div style={{ marginTop: '3rem' }}>
        <button
          className="btn btn-primary"
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '1.25rem', fontSize: '1.25rem', borderRadius: '1.5rem' }}
        >
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="spinner"></div> {t.form.generating}
            </div>
          ) : (
            <>{t.form.generateBtn} <ArrowRight size={24} /></>
          )}
        </button>
      </div>

      <style jsx>{`
        .label {
          display: block;
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 0.75rem;
          color: #718096;
          display: flex;
          align-items: center;
        }
        .spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .loading-animation {
          background: linear-gradient(90deg, #F8FAFC 25%, #F0FDF4 50%, #F8FAFC 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
        }
        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </form>
  );
}
