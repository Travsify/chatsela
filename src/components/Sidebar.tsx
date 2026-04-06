'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/auth/actions';

export default function Sidebar({ businessName, billingTier, isBotActive }: { businessName?: string, billingTier?: string, isBotActive?: boolean }) {
  const pathname = usePathname();

  const menuItems = [
    { name: '🚀 Command Center', href: '/dashboard', icon: '' },
    { name: '🧠 Intelligence Hub', href: '/dashboard/bot', icon: '' },
    { name: '📈 Sales Feed', href: '/dashboard/leads', icon: '' },
    { name: '⚙️ Settings', href: '/dashboard/settings', icon: '' }
  ];

  return (
    <>
      <aside className="glass desktop-only" style={{
        width: '260px',
        margin: '20px',
        borderRadius: '24px',
        padding: '30px',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
        flexShrink: 0,
        height: 'calc(100vh - 40px)',
        position: 'sticky',
        top: '20px'
      }}>
        <a href="/dashboard" style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'Outfit', background: 'var(--grad-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none' }}>
        ChatSela
        </a>
      
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }}>
          {menuItems.map((item, i) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <a key={i} href={item.href} style={{
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 500,
                color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                background: isActive ? 'var(--glass-bg)' : 'transparent',
                transition: 'all 0.3s ease',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }} className="glass-hover">
                <span>{item.icon}</span> {item.name}
              </a>
            );
          })}
        </nav>
      
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass" style={{ padding: '20px', borderRadius: '16px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Engine Status</p>
              <p style={{ fontWeight: 800, color: isBotActive ? '#00ff88' : '#ff4444', fontSize: '14px' }}>● {isBotActive ? 'ACTIVE' : 'PAUSED'}</p>
            </div>
            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', cursor: 'pointer' }}>⚙️</div>
          </div>

          <form action={logout}>
            <button style={{ 
              width: '100%', 
              background: 'transparent', 
              border: '1px solid rgba(255,255,255,0.05)', 
              color: 'var(--text-muted)',
              padding: '12px', 
              borderRadius: '12px', 
              fontSize: '13px', 
              cursor: 'pointer',
              transition: 'all 0.3s'
            }} className="glass-hover">
              Logout
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav mobile-only">
        {menuItems.slice(0, 4).map((item, i) => {
          const isActive = pathname === item.href;
          return (
            <a key={i} href={item.href} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
              textDecoration: 'none'
            }}>
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              {item.name.split(' ')[0]}
            </a>
          );
        })}
        <form action={logout}>
          <button style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '20px' }}>👋</span>
            Out
          </button>
        </form>
      </nav>
    </>
  );
}
