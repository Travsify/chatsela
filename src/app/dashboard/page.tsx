import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getDashboardStats } from './actions';
import WhatsAppConnector from '@/components/WhatsAppConnector';
import { toggleBotStatus, scrapeWebsiteToKnowledgeBase } from './bot/actions';
import { revalidatePath } from 'next/cache';

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  const { data: bot } = await supabase.from('bots').select('*').eq('user_id', user.id).maybeSingle();
  
  const stats = await getDashboardStats().catch(() => ({ totalValue: 0, hotLeads: 0, kbCount: 0, totalInsights: 0 }));
  const { data: session } = await supabase.from('whatsapp_sessions').select('status, phone_number').eq('user_id', user.id).maybeSingle();
  
  const isConnected = session?.status === 'connected';
  const isBotActive = bot?.status === 'active';

  const { data: recentInsights } = await supabase
    .from('chat_insights')
    .select('*')
    .eq('user_id', user.id)
    .order('last_interaction_at', { ascending: false })
    .limit(5);

  const businessName = profile?.business_name || user.email?.split('@')[0];

  // Actions for the UI
  async function handleToggle(formData: FormData) {
    'use server';
    const status = formData.get('status') === 'active' ? 'inactive' : 'active';
    await toggleBotStatus(status as any);
  }

  return (
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '40px', padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* ── COMMAND CENTER HERO ── */}
      <section style={{ 
        padding: '60px', 
        borderRadius: '40px', 
        background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        border: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow Background Decor */}
        <div style={{ position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)', width: '400px', height: '400px', background: isBotActive ? 'radial-gradient(circle, rgba(0,255,136,0.1) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(255,68,68,0.1) 0%, transparent 70%)', zIndex: 0 }} />

        <div style={{ zIndex: 1 }}>
          <h1 style={{ fontSize: '48px', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '12px' }}>
            {isBotActive ? 'Your Sales Engine is Live 🚀' : 'AI Engine is Paused ⏸️'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '18px', maxWidth: '600px', margin: '0 auto 32px' }}>
            {isBotActive 
              ? `Currently managing conversations for ${businessName} with God-Mode intelligence active.`
              : `Total autonomy is temporarily suspended. Click below to re-engage your sales closer.`}
          </p>

          <form action={handleToggle}>
            <input type="hidden" name="status" value={bot?.status || 'inactive'} />
            <button className="glow-btn" style={{ 
              padding: '20px 60px', 
              fontSize: '18px', 
              borderRadius: '20px',
              background: isBotActive ? 'var(--grad-primary)' : 'linear-gradient(135deg, #444, #222)',
              color: isBotActive ? '#000' : '#fff',
              border: isBotActive ? 'none' : '1px solid rgba(255,255,255,0.1)'
            }}>
              {isBotActive ? 'PAUSE AI ENGINE' : 'ACTIVATE AI ENGINE'}
            </button>
          </form>
        </div>

        {/* Quick Connection Status */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '20px', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: isConnected ? '#00ff88' : '#ff4444' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isConnected ? '#00ff88' : '#ff4444', boxShadow: isConnected ? '0 0 10px #00ff88' : 'none' }} />
            {isConnected ? 'WhatsApp Bound' : 'WhatsApp Disconnected'}
          </div>
          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: profile?.website_url ? '#3b82f6' : 'rgba(255,255,255,0.3)' }}>
            <span>🌐</span>
            {profile?.website_url ? `${profile.website_url.replace(/^https?:\/\//, '')} Linked` : 'No Website Connected'}
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        
        {/* ── MAGIC SETUP CARD ── */}
        <section className="glass" style={{ padding: '40px', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800 }}>🧠 Magic Intelligence Sync</h3>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', lineHeight: '1.6' }}>
            Paste your business URL below. ChatSela will crawl your entire site, extract prices, and train your AI in seconds. No manual typing required.
          </p>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <input 
              defaultValue={profile?.website_url || ''} 
              placeholder="https://yourbusiness.com" 
              style={{
                flex: 1,
                padding: '16px 20px',
                borderRadius: '16px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <button className="glow-btn" style={{ padding: '0 24px', borderRadius: '16px', fontSize: '14px' }}>
              SYNC NOW
            </button>
          </div>
          
          <div style={{ marginTop: 'auto', padding: '16px', borderRadius: '16px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)', fontSize: '13px', color: '#3b82f6' }}>
            🚀 <b>Pro Tip:</b> God-Mode uses this URL to find and share pricing PDFs automatically with customers.
          </div>
        </section>

        {/* ── LIVE INTELLIGENCE TICKER ── */}
        <section className="glass" style={{ padding: '40px', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800 }}>📈 Recent Intelligence</h3>
            <Link href="/dashboard/leads" style={{ color: 'var(--accent-primary)', fontSize: '13px', textDecoration: 'none' }}>View All →</Link>
          </div>

          {!recentInsights || recentInsights.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
              Waiting for live sales activity...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentInsights.map((insight, i) => (
                <div key={i} style={{ 
                  padding: '16px', 
                  borderRadius: '16px', 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid rgba(255,255,255,0.03)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ fontSize: '18px' }}>{insight.sentiment === 'positive' ? '💎' : '💬'}</div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 700 }}>{insight.customer_phone}</p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{insight.intent.toUpperCase()}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '14px', fontWeight: 800, color: insight.sentiment === 'positive' ? '#00ff88' : '#fff' }}>
                      ${Number(insight.value_estimate).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {!isConnected && <WhatsAppConnector />}

      <style>{`
        .glow-btn {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          font-weight: 700;
        }
        .glow-btn:hover {
          transform: translateY(-2px);
          filter: brightness(1.1);
          box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        .glow-btn:active {
          transform: translateY(0);
        }
      `}</style>
    </main>
  );
}
