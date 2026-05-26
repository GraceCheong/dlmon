'use client';

import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { 
  BookOpen, 
  Layers, 
  Languages, 
  ChevronRight
} from 'lucide-react';

export default function LandingPage() {
  const { t } = useLanguage();

  return (
    <main className={styles.main}>
      {/* Navigation */}
      <nav className={`${styles.nav} glass`}>
        <div className="container flex-between" style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>課</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
              課意<span style={{ color: 'var(--primary)' }}>studio</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <Link href="#features">{t.landing.features}</Link>
            <Link href="/dashboard" className="btn btn-primary">
              {t.common.dashboard} <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>
            {t.landing.subtitle.split('AI')[0]}AI {t.landing.subtitle.split('AI')[1]}
          </h1>
          <p>
            {t.landing.description}
          </p>
          <div className={styles.heroActions}>
            <Link href="/dashboard" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              {t.landing.startFree}
            </Link>
          </div>
          
          <div className={styles.heroImageWrapper}>
            <Image 
              src="/hero.png" 
              alt="Letto Teacher Studio Dashboard" 
              width={1000} 
              height={600} 
              className={styles.heroImage}
              priority
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.features}>
        <div className="container">
          <div className={styles.sectionTitle}>
            <h2>{t.landing.features}</h2>
            <p style={{ color: 'var(--secondary)', maxWidth: '600px', margin: '0 auto' }}>
              {t.landing.subtitle}
            </p>
          </div>

          <div className={styles.featureGrid}>
            <div className={`${styles.featureCard} card`}>
              <div className={styles.featureIcon}><BookOpen /></div>
              <h3>{t.landing.feature1Title}</h3>
              <p>{t.landing.feature1Desc}</p>
            </div>

            <div className={`${styles.featureCard} card`}>
              <div className={styles.featureIcon}><Layers /></div>
              <h3>{t.landing.feature2Title}</h3>
              <p>{t.landing.feature2Desc}</p>
            </div>

            <div className={`${styles.featureCard} card`}>
              <div className={styles.featureIcon}><Languages /></div>
              <h3>{t.landing.feature3Title}</h3>
              <p>{t.landing.feature3Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '4rem 0', borderTop: '1px solid var(--card-border)', background: 'var(--card-bg)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--secondary)' }}>
            &copy; 2026 課意studio (KeYi Studio). AI-powered Chinese Education Platform.
          </p>
        </div>
      </footer>
    </main>
  );
}
