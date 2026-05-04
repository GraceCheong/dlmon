'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Mail, Search, Trash2, X, Loader2 } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

export default function MembersClient({ initialMembers }: { initialMembers: Member[] }) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    );
  }, [members, searchTerm]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: inviteName, email: inviteEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to invite member');
        return;
      }
      setMembers((prev) => [data.member, ...prev]);
      setInviteName('');
      setInviteEmail('');
      setShowInvite(false);
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setPendingDelete(id);
    try {
      const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Failed to remove member');
        return;
      }
      setMembers((prev) => prev.filter((m) => m.id !== id));
      router.refresh();
    } finally {
      setPendingDelete(null);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4A5568' }}>수강생 관리</h1>
        <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
          <UserPlus size={20} /> 수강생 초대하기
        </button>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: '1rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#CBD5E0',
              }}
            />
            <input
              type="text"
              placeholder="이름 또는 이메일로 검색..."
              className="input"
              style={{ paddingLeft: '3rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', background: '#F8FAFC' }}>
              <th style={{ padding: '1rem 1.5rem', color: '#718096', fontSize: '0.85rem', fontWeight: 700 }}>이름</th>
              <th style={{ padding: '1rem 1.5rem', color: '#718096', fontSize: '0.85rem', fontWeight: 700 }}>이메일</th>
              <th style={{ padding: '1rem 1.5rem', color: '#718096', fontSize: '0.85rem', fontWeight: 700 }}>역할</th>
              <th style={{ padding: '1rem 1.5rem', color: '#718096', fontSize: '0.85rem', fontWeight: 700 }}>가입일</th>
              <th style={{ padding: '1rem 1.5rem' }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: '#A0AEC0' }}>
                  {members.length === 0
                    ? '아직 등록된 수강생이 없습니다. 첫 수강생을 초대해보세요.'
                    : '검색 결과가 없습니다.'}
                </td>
              </tr>
            )}
            {filtered.map((member) => (
              <tr key={member.id} style={{ borderBottom: '1px solid #F1F5F9', opacity: pendingDelete === member.id ? 0.5 : 1 }}>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'var(--primary-light)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                      }}
                    >
                      {member.name.substring(0, 1)}
                    </div>
                    <span style={{ fontWeight: 600, color: '#4A5568' }}>{member.name}</span>
                  </div>
                </td>
                <td style={{ padding: '1.25rem 1.5rem', color: '#718096', fontSize: '0.9rem' }}>{member.email}</td>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  <span
                    style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '1rem',
                      background: '#E0F2FE',
                      color: '#0EA5E9',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {member.role === 'student' ? '수강생' : member.role}
                  </span>
                </td>
                <td style={{ padding: '1.25rem 1.5rem', color: '#A0AEC0', fontSize: '0.85rem' }}>
                  {formatDate(member.joinedAt)}
                </td>
                <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                  <button
                    onClick={() => {
                      if (window.confirm(`${member.name} 학생을 삭제하시겠습니까?`)) {
                        handleDelete(member.id);
                      }
                    }}
                    disabled={pendingDelete === member.id}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#CBD5E0',
                      cursor: 'pointer',
                      padding: '0.5rem',
                    }}
                    title="수강생 삭제"
                  >
                    {pendingDelete === member.id ? <Loader2 size={18} className="spin" /> : <Trash2 size={18} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showInvite && (
        <div
          onClick={() => !submitting && setShowInvite(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleInvite}
            style={{
              background: 'white',
              padding: '2.5rem',
              borderRadius: '2rem',
              maxWidth: '420px',
              width: '90%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4A5568' }}>수강생 초대하기</h2>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                style={{ background: 'transparent', border: 'none', color: '#A0AEC0', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#718096', fontSize: '0.9rem' }}>
                  이름
                </label>
                <input
                  type="text"
                  className="input"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#718096', fontSize: '0.9rem' }}>
                  이메일
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#CBD5E0',
                    }}
                  />
                  <input
                    type="email"
                    className="input"
                    style={{ paddingLeft: '3rem' }}
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <div
                style={{
                  background: '#FEF2F2',
                  color: '#991B1B',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.75rem',
                  fontSize: '0.875rem',
                  marginBottom: '1rem',
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowInvite(false)}
                disabled={submitting}
              >
                취소
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting || !inviteName || !inviteEmail}>
                {submitting ? <><Loader2 size={16} className="spin" /> 추가 중...</> : '초대'}
              </button>
            </div>
          </form>
        </div>
      )}

      <style jsx>{`
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
