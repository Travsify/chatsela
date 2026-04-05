import React from 'react';
import { signup } from '@/app/auth/actions';

export default async function SignUp({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div className="auth-container" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top right, rgba(0, 255, 136, 0.05) 0%, transparent 50%), radial-gradient(circle at bottom left, rgba(0, 212, 255, 0.05) 0%, transparent 50%)',
      padding: '20px'
    }}>
      <div className="glass" style={{
        width: '100%',
        maxWidth: '450px',
        padding: '50px 40px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'Outfit', background: 'var(--grad-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '40px' }}>
          ChatSela
        </div>
        <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>Create your account</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '14px' }}>Start your 7-day free trial today.</p>
        
        {error && (
          <div style={{ padding: '12px', background: 'rgba(255, 59, 48, 0.1)', border: '1px solid #ff3b30', borderRadius: '8px', color: '#ff3b30', fontSize: '13px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <form action={signup} style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Business Name</label>
            <input type="text" name="business_name" placeholder="e.g. Acme Sales" required style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#fff',
              outline: 'none'
            }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Email Address</label>
            <input type="email" name="email" placeholder="name@company.com" required style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#fff',
              outline: 'none'
            }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Password</label>
            <input type="password" name="password" placeholder="••••••••" required style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#fff',
              outline: 'none'
            }} />
          </div>
          
          <button className="glow-btn" type="submit" style={{ width: '100%', marginTop: '10px' }}>Create Account</button>
        </form>
        
        <div style={{ marginTop: '30px', fontSize: '14px', color: 'var(--text-muted)' }}>
          Already have an account? <a href="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Log in</a>
        </div>
      </div>
    </div>
  );
}
