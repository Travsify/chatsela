import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import WhatsAppConnector from '@/components/WhatsAppConnector';
import LiveSalesFeed from '@/components/LiveSalesFeed';

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch Onboarding Status
  const { data: session } = await supabase
    .from('whatsapp_sessions')
    .select('status')
    .eq('user_id', user.id)
    .single();
  const isConnected = session?.status === 'connected';

  const { data: bots } = await supabase
    .from('bots')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);
  const hasBot = bots && bots.length > 0;

  const { data: products } = await supabase
    .from('products')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);
  const hasProducts = products && products.length > 0;

  const { data: connectors } = await supabase
    .from('external_connectors')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);
  const hasStore = connectors && connectors.length > 0;

  const hasPayments = !!(profile?.paystack_secret_enc || profile?.stripe_secret_enc);

  const fullyActive = isConnected && hasBot && hasPayments && (hasProducts || hasStore);

  return (
    <>
        {/* Center Column: Actions & Stats */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>Hello, {profile?.business_name || user.email?.split('@')[0]} 👋</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Your AI sales agent is ready to help you close more deals.</p>
            </div>
            <div style={{ display: 'flex', gap: '15px' }}>
              <div className="glass" style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔔</div>
            </div>
          </header>

          {/* Quick Start Checklist */}
          <section className="glass" style={{ padding: '24px', borderRadius: '24px', borderLeft: fullyActive ? '4px solid var(--accent-primary)' : '4px solid #ffaa00' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>🚀 Getting Started Checklist</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '15px' }}>
              {[
                { name: 'Connect WhatsApp', done: isConnected },
                { name: 'Connect Website', done: hasStore, link: '/dashboard/connect' },
                { name: 'Setup Payments', done: hasPayments, link: '/dashboard/settings/payments' },
                { name: 'Train AI Agent', done: hasBot, link: '/dashboard/bot' },
                { name: 'Add Products', done: hasProducts || hasStore, link: '/dashboard/products' },
                { name: 'Auto-Pilot Active', done: fullyActive }
              ].map((step, i) => (
                <a key={i} href={step.link || '#'} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '12px', background: step.done ? 'rgba(0,255,136,0.05)' : 'rgba(255,255,255,0.03)', borderRadius: '16px', textDecoration: 'none', color: '#fff', border: step.done ? '1px solid rgba(0,255,136,0.2)' : '1px solid transparent', textAlign: 'center' }} className={!step.done && step.link ? 'glass-hover' : ''}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: step.done ? 'none' : '1px solid var(--text-muted)', background: step.done ? 'var(--accent-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#000' }}>
                    {step.done ? '✓' : ''}
                  </div>
                  <span style={{ fontSize: '11px', opacity: step.done ? 0.7 : 1, fontWeight: step.done ? 600 : 400 }}>{step.name}</span>
                </a>
              ))}
            </div>
          </section>

          {/* Success Metrics (Simplified Stats) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {[
              { label: 'Money Made', val: '$0.00', trend: '↑ 0%', icon: '💰' },
              { label: 'Live Sales Chats', val: '0', trend: '↑ 0%', icon: '💬' },
              { label: 'Customers Helped', val: '0', trend: '↑ 0%', icon: '🙌' }
            ].map((stat, i) => (
              <div key={i} className="glass" style={{ padding: '24px', borderRadius: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                  <span style={{ fontSize: '20px' }}>{stat.icon}</span>
                  <span style={{ color: 'var(--accent-primary)', fontSize: '12px', fontWeight: 600 }}>{stat.trend}</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>{stat.label}</p>
                <div style={{ fontSize: '28px', fontWeight: 800 }}>{stat.val}</div>
              </div>
            ))}
          </div>

          <WhatsAppConnector />
        </main>

        {/* Right Column: Live Feed */}
        <LiveSalesFeed />
    </>
  );
}
