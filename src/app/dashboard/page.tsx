'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getDashboardStats } from './actions';
import WhatsAppConnector from '@/components/WhatsAppConnector';
import { toggleBotStatus, scrapeWebsiteToKnowledgeBase } from './bot/actions';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [bot, setBot] = useState<any>(null);
  const [stats, setStats] = useState({ totalValue: 0, hotLeads: 0, kbCount: 0, totalInsights: 0 });
  const [session, setSession] = useState<any>(null);
  const [recentInsights, setRecentInsights] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      setUser(u);

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', u.id).maybeSingle();
      setProfile(prof);
      setWebsiteUrl(prof?.website_url || '');

      const { data: b } = await supabase.from('bots').select('*').eq('user_id', u.id).maybeSingle();
      setBot(b);

      const s = await getDashboardStats().catch(() => ({ totalValue: 0, hotLeads: 0, kbCount: 0, totalInsights: 0 }));
      setStats(s);

      const { data: sess } = await supabase.from('whatsapp_sessions').select('status, phone_number').eq('user_id', u.id).maybeSingle();
      setSession(sess);

      const { data: insights } = await supabase.from('chat_insights').select('*').eq('user_id', u.id).order('last_interaction_at', { ascending: false }).limit(5);
      setRecentInsights(insights || []);
    })();
  }, [supabase]);

  const isConnected = session?.status === 'connected';
  const isBotActive = bot?.status === 'active';
  const businessName = profile?.business_name || user?.email?.split('@')[0];

  const handleToggle = async () => {
    const newStatus = isBotActive ? 'inactive' : 'active';
    const res = await toggleBotStatus(newStatus as any);
    if (res.success) setBot({ ...bot, status: newStatus });
  };

  const handleSync = async () => {
    if (!websiteUrl) return;
    setIsSyncing(true);
    const res = await scrapeWebsiteToKnowledgeBase(websiteUrl);
    setIsSyncing(false);
    if (res.success) alert('✅ Website Intelligence Synced!');
    else alert(`❌ Sync failed: ${res.error}`);
  };

  const handleDisconnect = async () => {
    if (confirm('Disconnect WhatsApp? This will pause all bot responses.')) {
      const { disconnectWhatsApp } = await import('./actions');
      await disconnectWhatsApp();
      setSession(null);
    }
  };

  const handleHandshake = async () => {
    setIsSyncing(true);
    try {
      const { syncHandshake } = await import('./actions');
      const res = await syncHandshake();
      if (res.authenticated) alert(`✅ Connected to ${res.phone}`);
      else alert(`❌ ${res.reason || 'Handshake failed.'}`);
    } catch (e: any) {
      alert(`❌ Sync failed: ${e.message}`);
    }
    setIsSyncing(false);
  };

  const copySnippet = () => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const code = `<script src="${baseUrl}/widget.js" data-id="${user?.id}"></script>`;
    navigator.clipboard.writeText(code);
    alert('Snippet copied to clipboard!');
  };

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

          <button onClick={handleToggle} className="glow-btn" style={{ 
              padding: '20px 60px', 
              fontSize: '18px', 
              borderRadius: '20px',
              background: isBotActive ? 'var(--grad-primary)' : 'linear-gradient(135deg, #444, #222)',
              color: isBotActive ? '#000' : '#fff',
              border: isBotActive ? 'none' : '1px solid rgba(255,255,255,0.1)'
            }}>
              {isBotActive ? 'PAUSE AI ENGINE' : 'ACTIVATE AI ENGINE'}
          </button>

        </div>

        {/* Quick Connection Status */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '20px', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: isConnected ? '#00ff88' : '#ff4444' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isConnected ? '#00ff88' : '#ff4444', boxShadow: isConnected ? '0 0 10px #00ff88' : 'none' }} />
            {isConnected ? 'WhatsApp Bound' : 'WhatsApp Disconnected'}
            {isConnected ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleHandshake} style={{ background: 'none', border: 'none', color: '#00ff88', textDecoration: 'underline', cursor: 'pointer', fontSize: '11px' }}>(Sync Handshake)</button>
                <button onClick={handleDisconnect} style={{ background: 'none', border: 'none', color: '#ff4444', textDecoration: 'underline', cursor: 'pointer', fontSize: '11px' }}>(Disconnect)</button>
              </div>
            ) : (
              <Link href="/dashboard/bot?tab=whatsapp" style={{ color: '#ff4444', textDecoration: 'underline', fontSize: '11px' }}>(Connect Now)</Link>
            )}
          </div>
          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: profile?.website_url ? '#3b82f6' : 'rgba(255,255,255,0.3)' }}>
            <span>🌐</span>
            {profile?.website_url ? `${profile.website_url.replace(/^https?:\/\//, '')} Linked` : 'No Website Connected'}
            <button onClick={copySnippet} style={{ background: 'none', border: 'none', color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer', fontSize: '11px', marginLeft: '8px' }}>(Get Snippet)</button>
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
              value={websiteUrl} 
              onChange={(e) => setWebsiteUrl(e.target.value)}
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
          </div>
          <button 
            onClick={handleSync} 
            disabled={isSyncing || !websiteUrl} 
            style={{ 
              padding: '16px 32px', 
              borderRadius: '16px', 
              fontSize: '16px', 
              fontWeight: 800, 
              background: isSyncing ? '#333' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
              color: '#fff', 
              border: 'none', 
              cursor: isSyncing || !websiteUrl ? 'not-allowed' : 'pointer',
              opacity: isSyncing || !websiteUrl ? 0.5 : 1,
              transition: 'all 0.3s ease',
              width: '100%'
            }}
          >
            {isSyncing ? '⏳ CRAWLING YOUR SITE...' : '🚀 CRAWL & TRAIN MY AI'}
          </button>

          
          <div style={{ marginTop: 'auto', padding: '16px', borderRadius: '16px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)', fontSize: '13px', color: '#3b82f6' }}>
            🚀 <b>Pro Tip:</b> God-Mode uses this URL to find and share pricing PDFs automatically with customers.
          </div>
        </section>

        {/* ── LIVE INTELLIGENCE FEED (THE LIVE BOARD) ── */}
        <section className="glass" style={{ padding: '40px', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800 }}>📡 Live Intelligence Feed</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00ff88', fontSize: '12px', fontWeight: 700 }}>
               <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00ff88', animation: 'pulse 1.5s infinite' }} />
               LIVE ACTIVITY
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentInsights.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '14px' }}>
                Awaiting interactions...
              </div>
            ) : (
              recentInsights.map((insight, i) => (
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
                    <div style={{ fontSize: '18px' }}>{insight.sentiment === 'positive' ? '🔥' : '💬'}</div>
                    <div style={{ fontSize: '14px' }}>
                      <b>{insight.customer_phone}</b> {insight.sentiment === 'positive' ? 'is a high-value lead.' : 'joined the chat.'}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{new Date(insight.last_interaction_at).toLocaleTimeString()}</div>
                </div>
              ))
            )}
            
            {/* Added Log for God-Mode Scraping visibility */}
            <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)', fontSize: '12px', color: '#3b82f6', fontFamily: 'monospace' }}>
              [SYSTEM] {isBotActive ? 'AI Engine Scanning for pricing updates...' : 'AI Engine Idle.'}
            </div>
          </div>
        </section>

        {/* ── SMART SNIPPET CARD ── */}
        <section className="glass" style={{ padding: '40px', borderRadius: '32px', border: '1px solid rgba(37,211,102,0.1)', background: 'rgba(0,255,136,0.02)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#00ff88' }}>📎 Smart Website Snippet</h3>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Paste this code into your website's <code>&lt;head&gt;</code> to enable real-time "God Mode" sync.</p>
          <div style={{ background: '#000', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontFamily: 'monospace', color: '#00ff88', overflowX: 'auto', whiteSpace: 'nowrap' }}>
            {`<script src="${process.env.NEXT_PUBLIC_SITE_URL}/widget.js" data-id="${user?.id}"></script>`}
          </div>
          <button onClick={copySnippet} className="glow-btn" style={{ background: '#00ff88', color: '#000', padding: '12px', borderRadius: '12px', fontSize: '14px' }}>
            COPY SNIPPET CODE
          </button>
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
