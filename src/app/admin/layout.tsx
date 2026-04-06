import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { logout } from '@/app/auth/actions';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, business_name')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    redirect('/dashboard');
  }

  const navItems = [
    { name: '📊 Radar', href: '/admin' },
    { name: '👥 Tenants', href: '/admin/users' },
    { name: '🔔 Global Gaps', href: '/admin/gaps' },
    { name: '← Dashboard', href: '/dashboard' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Admin Sidebar */}
      <aside className="glass" style={{
        width: '240px',
        margin: '20px',
        borderRadius: '24px',
        padding: '30px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '30px',
        flexShrink: 0,
        height: 'calc(100vh - 40px)',
        position: 'sticky',
        top: '20px',
        borderLeft: '3px solid #ef4444'
      }}>
        <div>
          <a href="/admin" style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'Outfit', background: 'linear-gradient(135deg, #ef4444, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none' }}>
            ChatSela Admin
          </a>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '6px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '2px' }}>God-Mode Command Center</p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          {navItems.map((item, i) => (
            <a key={i} href={item.href} style={{
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
              textDecoration: 'none',
              transition: 'all 0.2s'
            }} className="glass-hover">
              {item.name}
            </a>
          ))}
        </nav>

        <div style={{ marginTop: 'auto' }}>
          <form action={logout}>
            <button style={{
              width: '100%',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444',
              padding: '12px',
              borderRadius: '12px',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: 600
            }}>
              Logout
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '30px 40px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
