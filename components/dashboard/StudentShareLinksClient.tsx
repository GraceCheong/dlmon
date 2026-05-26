'use client';

import { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';

interface StudentShareMember {
  id: string;
  name: string;
  className: string | null;
  submitted: boolean;
}

interface Props {
  assignmentId: string;
  publicBaseUrl: string;
  members: StudentShareMember[];
}

function buildStudentUrl(publicBaseUrl: string, assignmentId: string, memberId: string) {
  return `${publicBaseUrl}/student/assignments/${assignmentId}?memberId=${memberId}`;
}

export default function StudentShareLinksClient({ assignmentId, publicBaseUrl, members }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState('');

  const copyLink = async (memberId: string) => {
    const url = buildStudentUrl(publicBaseUrl, assignmentId, memberId);
    setCopyError('');
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(memberId);
      window.setTimeout(() => setCopiedId((current) => (current === memberId ? null : current)), 1800);
    } catch {
      setCopyError('복사에 실패했습니다. 링크를 직접 선택해서 복사해 주세요.');
    }
  };

  if (members.length === 0) {
    return (
      <div style={{ marginTop: '1rem', color: '#718096', fontSize: '0.85rem' }}>
        등록된 학생이 없어 공유 링크를 만들 수 없습니다.
      </div>
    );
  }

  return (
    <div style={{ marginTop: '1.25rem', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.85rem' }}>
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#4A5568', marginBottom: '0.2rem' }}>
            학생별 공유 링크
          </h4>
          <p style={{ color: '#718096', fontSize: '0.82rem' }}>
            각 링크는 학생 식별용 `memberId`를 포함합니다.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '0.65rem' }}>
        {members.map((member) => {
          const url = buildStudentUrl(publicBaseUrl, assignmentId, member.id);
          const copied = copiedId === member.id;
          return (
            <div
              key={member.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(150px, 220px) minmax(0, 1fr) auto auto',
                alignItems: 'center',
                gap: '0.65rem',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 'var(--radius-md)',
                padding: '0.7rem',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#2D3748', fontWeight: 800, fontSize: '0.88rem', overflowWrap: 'anywhere' }}>
                  {member.name}
                </div>
                <div style={{ color: '#718096', fontSize: '0.76rem' }}>
                  {member.className || '소속 없음'} · {member.submitted ? '제출 완료' : '미제출'}
                </div>
              </div>

              <code
                style={{
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  background: '#EDF2F7',
                  color: '#4A5568',
                  borderRadius: '4px',
                  padding: '0.35rem 0.5rem',
                  fontSize: '0.78rem',
                  userSelect: 'all',
                }}
              >
                {url}
              </code>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => copyLink(member.id)}
                style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem' }}
              >
                {copied ? <><Check size={14} /> 복사됨</> : <><Copy size={14} /> 복사</>}
              </button>

              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem', textDecoration: 'none' }}
              >
                <ExternalLink size={14} /> 열기
              </a>
            </div>
          );
        })}
      </div>

      {copyError && (
        <div style={{ marginTop: '0.75rem', color: '#991B1B', background: '#FEE2E2', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.82rem' }}>
          {copyError}
        </div>
      )}
    </div>
  );
}
