'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/auth/actions';

export default function Sidebar({ businessName, billingTier }: { businessName?: string, billingTier?: string }) {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: '🤖 Bot Identity', href: '/dashboard/bot', icon: '👤' },
    { name: '🎓 Train Your Bot', href: '/dashboard/train', icon: '🧠' },
    { name: '📁 Product Catalog', href: '/dashboard/products', icon: '📦' },
    { name: '💬 Sales & Insights', href: '/dashboard/leads', icon: '📈' },
    { name: '⚙️ System Settings', href: '/dashboard/settings', icon: '⚙️' }
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
      
        <div style={{ marginTop: 'auto' }}>
          <form action={logout}>
            <button style={{ 
              width: '100%', 
              background: 'transparent', 
              border: '1px solid rgba(255,255,255,0.1)', 
              color: 'var(--text-muted)',
              padding: '12px', 
              borderRadius: '12px', 
              fontSize: '14px', 
              cursor: 'pointer',
              marginBottom: '20px',
              transition: 'all 0.3s'
            }} className="glass-hover">
              Logout
            </button>
          </form>
          <div className="glass" style={{ padding: '20px', borderRadius: '16px', fontSize: '13px' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '8px', fontSize: '12px' }}>Current Account</p>
            <p style={{ fontWeight: 600, marginBottom: '15px' }}>{billingTier?.toUpperCase() || 'STARTER'} TRIAL</p>
            <a href="/dashboard/pricing" style={{ display: 'block', textAlign: 'center', width: '100%', background: 'var(--grad-primary)', border: 'none', padding: '10px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: '#000', textDecoration: 'none' }}>
              Upgrade Plan
            </a>
          </div>
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
