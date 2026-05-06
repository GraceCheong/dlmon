'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Settings,
  LogOut,
  PlusCircle,
  Menu,
  Sparkles,
  Users,
  Award,
  FileDown
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useLanguage } from '@/context/LanguageContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const { t, language, setLanguage } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading' || status === 'unauthenticated') {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}><div className="spinner"></div></div>;
  }

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      {/* Sidebar */}
      <aside style={{
        width: '280px',
        background: 'var(--sidebar-bg)',
        color: 'var(--sidebar-fg)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem',
        position: 'fixed',
        height: '100vh',
        zIndex: 100,
        boxShadow: '4px 0 20px rgba(0,0,0,0.02)',
        borderRight: '1px solid var(--card-border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem', padding: '0.5rem' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, var(--primary-light), #EFF6FF)', 
            padding: '0.6rem', 
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>課</span>
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#4A5568', display: 'block' }}>
              課意<span style={{ color: 'var(--primary)' }}>studio</span>
            </span>
            <span style={{ fontSize: '0.7rem', color: '#A0AEC0', fontWeight: 500 }}>KeYi Studio</span>
          </div>
        </div>


        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <SidebarLink href="/dashboard" icon={<LayoutDashboard size={20} />} label={t.common.dashboard} active={pathname === '/dashboard'} />
          <SidebarLink href="/courses" icon={<BookOpen size={20} />} label={t.common.myCourses} active={pathname === '/courses'} />
          <SidebarLink href="/members" icon={<Users size={20} />} label={t.common.members} active={pathname === '/members'} />
          <SidebarLink href="/assignments" icon={<Award size={20} />} label={t.common.assignments} active={pathname.startsWith('/assignments')} />
          <SidebarLink href="/syllabi" icon={<FileText size={20} />} label={t.common.syllabi} active={pathname === '/syllabi'} />
          
          <div style={{ margin: '1.5rem 0 0.5rem', padding: '0 0.75rem', fontSize: '0.7rem', color: '#CBD5E0', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em' }}>
            {t.common.authoring}
          </div>
          
          <Link href="/courses/new" className="btn btn-primary" style={{ justifyContent: 'flex-start', padding: '0.875rem 1.25rem' }}>
            <PlusCircle size={20} /> {t.common.newCourse}
          </Link>
          <SidebarLink href="/materials/import/youtube" icon={<FileDown size={20} />} label={t.common.youtubeImport} active={pathname.startsWith('/materials')} />
        </nav>

        <div style={{ borderTop: '2px solid #F8FAFC', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {/* Language Switcher */}
          <div style={{ padding: '0.25rem', marginBottom: '0.5rem', background: '#F8FAFC', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', gap: '2px' }}>
              <button 
                onClick={() => setLanguage('ko')}
                style={{ 
                  flex: 1, 
                  padding: '6px', 
                  fontSize: '0.75rem', 
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  background: language === 'ko' ? 'white' : 'transparent',
                  color: language === 'ko' ? 'var(--primary)' : '#A0AEC0',
                  boxShadow: language === 'ko' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                한국어
              </button>
              <button 
                onClick={() => setLanguage('en')}
                style={{ 
                  flex: 1, 
                  padding: '6px', 
                  fontSize: '0.75rem', 
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  background: language === 'en' ? 'white' : 'transparent',
                  color: language === 'en' ? 'var(--primary)' : '#A0AEC0',
                  boxShadow: language === 'en' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                English
              </button>
            </div>
          </div>
          
          <SidebarLink href="/settings" icon={<Settings size={20} />} label={t.common.settings} active={pathname === '/settings'} />
          <button 
            onClick={handleLogout}
            style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              color: '#A0AEC0',
              fontWeight: 500,
              border: 'none',
              width: '100%',
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            <LogOut size={20} />
            <span>{t.common.logout}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ marginLeft: '280px', flex: 1, padding: '2.5rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{t.dashboard.welcome}</h1>
            <p style={{ color: '#A0AEC0', fontSize: '0.95rem', marginTop: '0.25rem' }}>{t.dashboard.subtitle}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{session?.user?.name || '선생님'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>{t.common.memberType}</div>
            </div>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: 'var(--radius-md)', 
              background: 'var(--primary-light)', 
              color: 'var(--primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: 800,
              fontSize: '1.1rem',
              border: '2px solid white',
              boxShadow: '0 4px 12px rgba(152, 216, 170, 0.2)'
            }}>
              {(session?.user?.name || 'U').substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

import Link from 'next/link';

function SidebarLink({ href, icon, label, active = false }: { href: string, icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <Link href={href} style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.875rem',
      padding: '0.875rem 1.25rem',
      borderRadius: 'var(--radius-md)',
      background: active ? 'var(--sidebar-active)' : 'transparent',
      color: active ? 'var(--sidebar-active-text)' : 'var(--sidebar-fg)',
      fontWeight: active ? 700 : 500,
      transition: 'all 0.3s ease'
    }}>
      <div style={{ color: active ? 'var(--primary)' : 'inherit' }}>
        {icon}
      </div>
      <span>{label}</span>
    </Link>
  );
}
