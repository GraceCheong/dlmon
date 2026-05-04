'use client';

import React, { useEffect, useState } from 'react';
import { User, Mail, Globe, Save, Sparkles, Loader2, Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface Settings {
  displayName: string;
  email: string;
  language: 'ko' | 'en';
  aiMode: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  displayName: '',
  email: '',
  language: 'ko',
  aiMode: true,
};

export default function SettingsPage() {
  const { t, setLanguage } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  // Load current settings on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) throw new Error('load failed');
        const data = await res.json();
        if (cancelled) return;
        setSettings({
          displayName: data.settings.displayName ?? data.settings.name ?? '',
          email: data.settings.email ?? '',
          language: data.settings.language === 'en' ? 'en' : 'ko',
          aiMode: !!data.settings.aiMode,
        });
        // Sync the LanguageContext with the persisted preference.
        setLanguage(data.settings.language === 'en' ? 'en' : 'ko');
      } catch (e) {
        if (!cancelled) setError('설정을 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // setLanguage is stable from context; deliberately omitting to avoid reload loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '저장에 실패했습니다.');
        return;
      }
      setLanguage(settings.language);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } catch {
      setError('네트워크 오류로 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#A0AEC0' }}>
        <Loader2 size={28} className="spin" /> 설정을 불러오는 중...
        <style jsx>{`
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.75rem', color: '#4A5568' }}>{t.common.settings}</h1>
        <p style={{ color: '#A0AEC0', fontSize: '1rem' }}>계정 정보와 스튜디오 환경을 선생님의 취향에 맞게 설정하세요.</p>
      </div>

      {/* Profile */}
      <section className="card" style={{ padding: '2.5rem', border: 'none' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#4A5568' }}>
          <div style={{ background: 'var(--primary-light)', padding: '0.6rem', borderRadius: '1rem', color: 'var(--primary)' }}>
            <User size={24} />
          </div>
          프로필 정보
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <label className="label">이름</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#CBD5E0' }} />
              <input
                type="text"
                className="input"
                value={settings.displayName}
                onChange={(e) => update('displayName', e.target.value)}
                style={{ paddingLeft: '3.25rem' }}
              />
            </div>
          </div>
          <div>
            <label className="label">이메일 주소</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#CBD5E0' }} />
              <input
                type="email"
                className="input"
                value={settings.email}
                onChange={(e) => update('email', e.target.value)}
                style={{ paddingLeft: '3.25rem' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section className="card" style={{ padding: '2.5rem', border: 'none' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#4A5568' }}>
          <div style={{ background: 'var(--secondary-hover)15', padding: '0.6rem', borderRadius: '1rem', color: 'var(--secondary-hover)' }}>
            <Globe size={24} />
          </div>
          사용자 취향 설정
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <label className="label">스튜디오 언어</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => update('language', 'ko')}
                className={`btn ${settings.language === 'ko' ? 'btn-primary' : ''}`}
                style={{
                  flex: 1,
                  background: settings.language === 'ko' ? 'var(--primary)' : '#F8FAFC',
                  color: settings.language === 'ko' ? 'white' : '#A0AEC0',
                  border: settings.language === 'ko' ? 'none' : '2px solid #F1F5F9',
                }}
              >
                한국어 (Korean)
              </button>
              <button
                type="button"
                onClick={() => update('language', 'en')}
                className={`btn ${settings.language === 'en' ? 'btn-primary' : ''}`}
                style={{
                  flex: 1,
                  background: settings.language === 'en' ? 'var(--primary)' : '#F8FAFC',
                  color: settings.language === 'en' ? 'white' : '#A0AEC0',
                  border: settings.language === 'en' ? 'none' : '2px solid #F1F5F9',
                }}
              >
                English
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.5rem',
              background: 'var(--primary-light)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--primary-hover)',
              border: '2px solid white',
              boxShadow: '0 8px 20px rgba(152, 216, 170, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'white', padding: '0.75rem', borderRadius: '1rem', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                <Sparkles size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>AI 강의 도우미 모드</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>커리큘럼 설계 시 고급 AI 기능을 활용합니다.</div>
              </div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.aiMode}
                onChange={(e) => update('aiMode', e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>
        </div>
      </section>

      {error && (
        <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '1rem 1.5rem', borderRadius: '1rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginBottom: '4rem' }}>
        {savedFlash && (
          <span style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
            <Check size={18} /> 저장되었습니다
          </span>
        )}
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}
        >
          {saving ? <><Loader2 size={20} className="spin" /> 저장 중...</> : <><Save size={20} /> 설정 저장하기</>}
        </button>
      </div>

      <style jsx>{`
        .label { display: block; font-size: 0.95rem; font-weight: 700; margin-bottom: 0.75rem; color: #718096; }
        .switch { position: relative; display: inline-block; width: 60px; height: 34px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #CBD5E0; transition: .4s; }
        .slider:before { position: absolute; content: ""; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: white; transition: .4s; }
        input:checked + .slider { background-color: var(--primary); }
        input:focus + .slider { box-shadow: 0 0 1px var(--primary); }
        input:checked + .slider:before { transform: translateX(26px); }
        .slider.round { border-radius: 34px; }
        .slider.round:before { border-radius: 50%; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
