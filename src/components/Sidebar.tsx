'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/auth/actions';

interface MenuItem {
  name: string;
  href: string;
  icon: string;
}

export default function Sidebar({ 
  businessName, 
  billingTier, 
  isBotActive, 
  industry = 'retail' 
}: { 
  businessName?: string, 
  billingTier?: string, 
  isBotActive?: boolean,
  industry?: string
}) {
  const pathname = usePathname();

  // 🛠️ Dynamic Navigation Logic per Industry
  const getMenuItems = (): MenuItem[] => {
    switch (industry) {
      case 'healthcare':
        return [
          { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
          { name: 'Services', href: '/dashboard/services', icon: '🏥' },
          { name: 'Inbox', href: '/dashboard/chat', icon: '📥' },
          { name: 'Orders', href: '/dashboard/orders', icon: '🛍️' },
          { name: 'Campaigns', href: '/dashboard/campaigns', icon: '📣' },
          { name: 'Automations', href: '/dashboard/automations', icon: '🤖' },
          { name: 'Analytics', href: '/dashboard/analytics', icon: '📊' },
          { name: 'Patients', href: '/dashboard/leads', icon: '👥' },
          { name: 'Team', href: '/dashboard/team', icon: '🤝' },
          { name: 'Settings', href: '/dashboard/bot', icon: '⚙️' }
        ];
      case 'logistics':
        return [
          { name: 'Dashboard', href: '/dashboard', icon: '🚚' },
          { name: 'Shipments', href: '/dashboard/orders', icon: '📦' },
          { name: 'Inbox', href: '/dashboard/chat', icon: '📥' },
          { name: 'Quoting', href: '/dashboard/logistics', icon: '💰' },
          { name: 'Tracking', href: '/dashboard/tracking', icon: '📍' },
          { name: 'Analytics', href: '/dashboard/analytics', icon: '📊' },
          { name: 'Intelligence Hub', href: '/dashboard/bot', icon: '🧠' },
          { name: 'Settings', href: '/dashboard/settings', icon: '⚙️' }
        ];
      default: // Retail / General
        return [
          { name: 'Dashboard', href: '/dashboard', icon: '📊' },
          { name: 'Products', href: '/dashboard/bot?tab=catalog', icon: '🛍️' },
          { name: 'Inbox', href: '/dashboard/chat', icon: '📤' },
          { name: 'Orders', href: '/dashboard/orders', icon: '📦' },
          { name: 'Campaigns', href: '/dashboard/campaigns', icon: '🚀' },
          { name: 'Intelligence Hub', href: '/dashboard/bot', icon: '🧠' },
          { name: 'Settings', href: '/dashboard/bot?tab=identity', icon: '⚙️' }
        ];
    }
  };

  const menuItems = getMenuItems();

  return (
    <>
      <aside className="glass desktop-only" style={{
        width: '280px',
        margin: '20px',
        borderRadius: '32px',
        padding: '40px 30px',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        flexShrink: 0,
        height: 'calc(100vh - 40px)',
        position: 'sticky',
        top: '20px',
        border: '1px solid rgba(255,255,255,0.05)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '20px', color: '#000' }}>C</div>
          <a href="/dashboard" style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'Outfit', color: '#fff', textDecoration: 'none', letterSpacing: '-0.03em' }}>
            Chatsela
          </a>
        </div>
      
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
          {menuItems.map((item, i) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <a key={i} href={item.href} style={{
                padding: '12px 16px',
                borderRadius: '16px',
                fontSize: '14px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
                background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                transition: 'all 0.2s ease',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                userSelect: 'none'
              }} className="nav-item">
                <span style={{ fontSize: '18px', opacity: isActive ? 1 : 0.5 }}>{item.icon}</span> 
                {item.name}
              </a>
            );
          })}
        </nav>
      
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '20px', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 800 }}>AI Status</span>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isBotActive ? '#00ff88' : '#ff4444', boxShadow: isBotActive ? '0 0 10px #00ff88' : 'none' }} />
            </div>
            <p style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>{isBotActive ? 'Engine Live' : 'Engine Idle'}</p>
          </div>

          <form action={logout}>
            <button style={{ 
              width: '100%', 
              background: 'transparent', 
              border: '1px solid rgba(255,255,255,0.05)', 
              color: 'rgba(255,255,255,0.3)',
              padding: '14px', 
              borderRadius: '16px', 
              fontSize: '13px', 
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.3s'
            }} className="logout-btn">
              Logout
            </button>
          </form>
        </div>

        <style>{`
          .nav-item:hover {
            color: #fff !important;
            background: rgba(255,255,255,0.03) !important;
          }
          .logout-btn:hover {
            border-color: rgba(255,255,255,0.2) !important;
            color: #fff !important;
          }
        `}</style>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav mobile-only" style={{ display: 'none' /* For now hide unless requested */ }}>
        {/* Mobile nav logic... */}
      </nav>
    </>
  );
}
