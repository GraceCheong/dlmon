'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
        setLoading(false);
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'linear-gradient(135deg, #F0FDF4 0%, #E0F2FE 100%)',
      padding: '2rem'
    }}>
      <div className="card" style={{ 
        maxWidth: '450px', 
        width: '100%', 
        padding: '3rem', 
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          width: '64px', 
          height: '64px', 
          background: 'var(--primary-light)', 
          color: 'var(--primary)', 
          borderRadius: '1.5rem', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '0 auto 1.5rem' 
        }}>
          <Sparkles size={32} />
        </div>
        
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4A5568', marginBottom: '0.5rem' }}>Welcome Back</h1>
        <p style={{ color: '#A0AEC0', marginBottom: '2.5rem' }}>Log in to manage your lessons and members</p>

        {error && (
          <div style={{ 
            background: '#FEE2E2', 
            color: '#EF4444', 
            padding: '0.75rem', 
            borderRadius: '0.75rem', 
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            fontWeight: 600
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#718096', marginBottom: '0.5rem' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#CBD5E0' }} />
              <input 
                type="email" 
                required 
                className="input" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '3rem' }}
                placeholder="teacher@letto.edu"
              />
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#718096', marginBottom: '0.5rem' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#CBD5E0' }} />
              <input 
                type="password" 
                required 
                className="input" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '3rem' }}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary" 
            style={{ width: '100%', padding: '1rem', fontSize: '1rem', borderRadius: '1rem' }}
          >
            {loading ? 'Logging in...' : 'Sign In'} <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
          </button>
        </form>

        <div style={{ marginTop: '2rem', fontSize: '0.875rem', color: '#A0AEC0' }}>
          Don&apos;t have an account? <Link href="/" style={{ color: 'var(--primary)', fontWeight: 700 }}>Start for free</Link>
        </div>
      </div>
    </div>
  );
}
