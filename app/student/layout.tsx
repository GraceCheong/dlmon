'use client';

import { Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
      <header style={{ 
        background: 'white', 
        padding: '1rem 2rem', 
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <div style={{ background: 'var(--primary-light)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
            <Sparkles size={20} color="var(--primary)" />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: '#4A5568' }}>
            Letto <span style={{ color: 'var(--primary)' }}>Student</span>
          </span>
        </Link>
        <div style={{ fontSize: '0.875rem', color: '#718096', fontWeight: 600 }}>
          학생 워크스페이스
        </div>
      </header>
      <main style={{ flex: 1, padding: '2rem' }}>
        {children}
      </main>
    </div>
  );
}
