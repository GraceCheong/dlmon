'use client';

import { useState, useEffect } from 'react';
import { Search, Download, Loader2, Globe, BookOpen } from 'lucide-react';
import AudienceSelector from '@/components/shared/AudienceSelector';
import { audienceLabel } from '@/components/shared/AudienceSelector';

interface Listing {
  id: string; title: string; description: string | null; type: string;
  targetAudience: string | null; hskLevel: string | null; copyCount: number;
  publishedAt: string; publisher: { name: string | null; displayName: string | null };
}

const HSK_LEVELS = ['', 'HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'];

export default function MarketplaceClient() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState<string | null>(null);
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [audience, setAudience] = useState('');
  const [hskLevel, setHskLevel] = useState('');
  const [type, setType] = useState('');
  const [error, setError] = useState('');

  const fetchListings = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (audience) params.set('audience', audience);
      if (hskLevel) params.set('hskLevel', hskLevel);
      if (type) params.set('type', type);
      const res = await fetch(`/api/marketplace/templates?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '목록을 불러오지 못했습니다.');
        setListings([]);
        return;
      }
      setListings(data.listings || []);
    } catch {
      setError('목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchListings(); }, []);

  const copy = async (id: string) => {
    setCopying(id);
    try {
      const res = await fetch(`/api/marketplace/templates/${id}/copy`, { method: 'POST' });
      if (res.ok) {
        setCopiedIds(prev => new Set([...prev, id]));
        setListings(prev => prev.map(l => l.id === id ? { ...l, copyCount: l.copyCount + 1 } : l));
      } else {
        const d = await res.json();
        setError(d.error || '복사 실패');
      }
    } catch {
      setError('복사 중 오류가 발생했습니다.');
    } finally {
      setCopying(null);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4A5568', marginBottom: '0.25rem' }}>마켓플레이스</h1>
        <p style={{ color: '#A0AEC0', fontSize: '0.95rem' }}>다른 선생님들이 공유한 무료 수업 템플릿을 찾아보세요.</p>
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 160px 110px 120px auto', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0' }} />
            <input
              className="input"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchListings()}
              placeholder="템플릿 검색..."
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
          <AudienceSelector value={audience} onChange={setAudience} style={{ width: '160px' }} />
          <select className="input" value={hskLevel} onChange={e => setHskLevel(e.target.value)} style={{ width: '110px' }}>
            {HSK_LEVELS.map(l => <option key={l} value={l}>{l || 'HSK 전체'}</option>)}
          </select>
          <select className="input" value={type} onChange={e => setType(e.target.value)} style={{ width: '120px' }}>
            <option value="">유형 전체</option>
            <option value="lesson">수업</option>
            <option value="worksheet">활동지</option>
            <option value="assessment">평가</option>
          </select>
          <button className="btn btn-primary" onClick={fetchListings}>검색</button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: '#A0AEC0' }}>
          <Loader2 size={32} className="spin" />
        </div>
      ) : listings.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', color: '#A0AEC0' }}>
          <Globe size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <p>검색 결과가 없습니다.</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>다른 키워드로 검색하거나, 내 템플릿을 마켓에 먼저 게시해 보세요.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {listings.map(listing => (
            <div key={listing.id} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <BookOpen size={16} color="var(--primary)" />
                  <span style={{ fontWeight: 700, color: '#2D3748', fontSize: '0.95rem' }}>{listing.title}</span>
                </div>
                {listing.description && (
                  <p style={{ fontSize: '0.85rem', color: '#718096', lineHeight: 1.5 }}>{listing.description}</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {listing.targetAudience && (
                  <span style={{ fontSize: '0.75rem', background: '#EFF6FF', color: '#1D4ED8', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)' }}>
                    {audienceLabel(listing.targetAudience)}
                  </span>
                )}
                {listing.hskLevel && (
                  <span style={{ fontSize: '0.75rem', background: '#F0FDF4', color: '#166534', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)' }}>
                    {listing.hskLevel}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <div style={{ fontSize: '0.8rem', color: '#A0AEC0' }}>
                  {listing.publisher.displayName || listing.publisher.name || '익명'} · {listing.copyCount}회 복사
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => copy(listing.id)}
                  disabled={copying !== null || copiedIds.has(listing.id)}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                >
                  {copying === listing.id ? <Loader2 size={14} className="spin" /> :
                   copiedIds.has(listing.id) ? '✓ 복사됨' : <><Download size={14} /> 복사하기</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
