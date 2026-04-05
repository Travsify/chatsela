import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getDashboardStats } from './actions';
import WhatsAppConnector from '@/components/WhatsAppConnector';

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  
  // Dashboard Intelligence (Real Data)
  const stats = await getDashboardStats().catch(() => ({ totalValue: 0, hotLeads: 0, kbCount: 0, totalInsights: 0 }));

  // Fetch Onboarding Status
  const { data: session } = await supabase.from('whatsapp_sessions').select('status').eq('user_id', user.id).single();
  const isConnected = session?.status === 'connected';

  // Fetch Recent Insights (For Preview)
  const { data: recentInsights } = await supabase
    .from('chat_insights')
    .select('*')
    .eq('user_id', user.id)
    .order('last_interaction_at', { ascending: false })
    .limit(3);

  const businessName = profile?.business_name || user.email?.split('@')[0];

  return (
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '30px', padding: '20px' }}>
      
      {/* ── Dashboard Hero: AI Status ────────────────────────────────────────── */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-0.02em' }}>
            Hello, {businessName} 👋
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <div style={{ 
               display: 'flex', 
               alignItems: 'center', 
               gap: '8px', 
               padding: '6px 14px', 
               borderRadius: '20px', 
               background: isConnected ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 255, 255, 0.05)',
               border: `1px solid ${isConnected ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 255, 255, 0.1)'}`,
               fontSize: '12px',
               fontWeight: '600',
               color: isConnected ? '#00ff88' : 'var(--text-muted)'
             }}>
               <div style={{ 
                 width: '8px', 
                 height: '8px', 
                 borderRadius: '50%', 
                 background: isConnected ? '#00ff88' : 'gray',
                 boxShadow: isConnected ? '0 0 10px #00ff88' : 'none',
                 animation: isConnected ? 'pulse 2s infinite' : 'none'
               }} />
               {isConnected ? 'AI Sales Agent: ACTIVE' : 'AI Offline (Connect WhatsApp)'}
             </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>ChatSela Sales Engine analyzing 24/7</span>
          </div>
        </div>
        
        <Link href="/dashboard/leads" className="glass-hover" style={{ 
          padding: '12px 24px', 
          borderRadius: '14px', 
          backgroundColor: 'rgba(255,255,255,0.05)', 
          color: '#fff', 
          fontSize: '14px', 
          fontWeight: '600',
          textDecoration: 'none',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          View Sales Intelligence →
        </Link>
      </header>

      {/* ── Intelligence Grid (Stats) ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        {[
          { label: 'Pipeline Value', val: `$${stats.totalValue.toLocaleString()}`, icon: '💰', color: '#10b981' },
          { label: 'Hot Leads', val: stats.hotLeads, icon: '🔥', color: '#f59e0b' },
          { label: 'Trained Facts', val: stats.kbCount, icon: '🧠', color: '#3b82f6' },
          { label: 'Total Inquiries', val: stats.totalInsights, icon: '📨', color: '#8b5cf6' }
        ].map((stat, i) => (
          <div key={i} className="glass" style={{ padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '24px', marginBottom: '16px' }}>{stat.icon}</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px', fontWeight: '700' }}>
              {stat.label}
            </p>
            <div style={{ fontSize: '28px', fontWeight: '800', color: stat.color }}>{stat.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px' }}>
        
        {/* ── Left: High-Priority Opportunities (Insights Preview) ────────────── */}
        <section className="glass" style={{ padding: '30px', borderRadius: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Recent Intelligence</h3>
            <Link href="/dashboard/leads" style={{ fontSize: '13px', color: 'var(--accent-primary)', textDecoration: 'none' }}>View All Intelligence</Link>
          </div>

          {!recentInsights || recentInsights.length === 0 ? (
             <div style={{ padding: '60px 20px', textAlign: 'center', opacity: 0.5 }}>
                <p>Waiting for the first conversation analysis...</p>
             </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {recentInsights.map((insight, idx) => (
                <div key={idx} style={{ 
                  padding: '16px', 
                  borderRadius: '16px', 
                  backgroundColor: 'rgba(255,255,255,0.02)', 
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div style={{ fontSize: '20px' }}>{insight.sentiment === 'positive' ? '🔥' : '💬'}</div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '700', marginBottom: '2px' }}>{insight.customer_phone}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {insight.summary}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: insight.sentiment === 'positive' ? '#10b981' : '#fff' }}>
                      ${Number(insight.value_estimate).toLocaleString()}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Est. Value</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="glass" style={{ marginTop: 'auto', padding: '20px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(0, 168, 132, 0.05), transparent)', border: '1px solid rgba(0, 168, 132, 0.1)' }}>
             <p style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>🚀 Tip: Feed the AI</p>
             <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
               Add your website or specific business facts to the **Knowledge Vault** to make the Sales Engine even more accurate.
             </p>
             <Link href="/dashboard/bot" style={{ display: 'inline-block', marginTop: '12px', fontSize: '12px', fontWeight: '700', color: '#00a884', textDecoration: 'none' }}>
               Manage Knowledge →
             </Link>
          </div>
        </section>

        {/* ── Right: AI Pulse & Quick Tools ──────────────────────────────────── */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {!isConnected && <WhatsAppConnector />}
          
          <div className="glass" style={{ padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>🤖 Sales Agent Features</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
               {[
                 { name: 'Structured Sequences', desc: 'Auto-reply to common steps', active: true },
                 { name: 'Seamless Checkouts', desc: 'Programmable payment links', active: true },
                 { name: 'Lead Sentiment Analysis', desc: 'Predicting purchase intent', active: true },
                 { name: 'Multi-Source Knowledge', desc: 'Reading your site & docs', active: true },
               ].map((f, i) => (
                 <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: f.active ? 1 : 0.4 }}>
                    <div style={{ color: '#10b981', fontSize: '14px' }}>✓</div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '600' }}>{f.name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{f.desc}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </section>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(0, 255, 136, 0.4); }
          70% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 0 10px rgba(0, 255, 136, 0); }
          100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(0, 255, 136, 0); }
        }
      `}</style>
    </main>
  );
}
