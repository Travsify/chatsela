'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { getBotActivity } from '../actions';

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'leads' | 'activity'>('leads');
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [leadsRes, activityRes] = await Promise.all([
        supabase.from('chat_insights').select('*').eq('user_id', user.id).order('last_interaction_at', { ascending: false }),
        getBotActivity()
      ]);

      setLeads(leadsRes.data || []);
      setActivity(activityRes || []);
      setIsLoading(false);
    })();

    // Subscribe to new activity for real-time visibility
    const channel = supabase
      .channel('bot_activity_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bot_activity' }, (payload) => {
        setActivity(prev => [payload.new, ...prev].slice(0, 30));
        // Also update the Leads if it's an intent event
        if (payload.new.event_type === 'intent') {
           // Refresh leads too
           supabase.from('chat_insights').select('*').order('last_interaction_at', { ascending: false }).then(res => setLeads(res.data || []));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const totalValue = leads?.reduce((acc, lead) => acc + (Number(lead.value_estimate) || 0), 0) || 0;

  return (
    <main style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-0.02em' }}>
            {activeTab === 'leads' ? '🔥 Sales Intelligence' : '📡 Live Activity Board'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '16px' }}>
            {activeTab === 'leads' 
              ? 'Real-time analysis of high-intent customers ready to buy.' 
              : 'Streaming live interactions and system events from your AI Engine.'}
          </p>
        </div>
        
        <div className="glass" style={{ padding: '20px 30px', borderRadius: '20px', textAlign: 'right', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
            Pipeline Potential
          </p>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#10b981' }}>
            ${totalValue.toLocaleString()}
          </h2>
        </div>
      </header>

      {/* ── TAB SELECTOR ── */}
      <div style={{ display: 'flex', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '16px', alignSelf: 'flex-start' }}>
        <button 
          onClick={() => setActiveTab('leads')}
          style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: activeTab === 'leads' ? 'var(--accent-primary)' : 'transparent', color: activeTab === 'leads' ? '#000' : '#fff', fontWeight: 700, cursor: 'pointer' }}
        >
          🔥 LEADS
        </button>
        <button 
          onClick={() => setActiveTab('activity')}
          style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: activeTab === 'activity' ? '#3b82f6' : 'transparent', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
        >
          📡 LIVE BOARD
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: '100px', textAlign: 'center', opacity: 0.5 }}>Syncing live data...</div>
      ) : activeTab === 'leads' ? (
        /* ── LEADS GRID ── */
        leads.length === 0 ? (
          <div className="glass" style={{ padding: '80px 40px', borderRadius: '32px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>💬</div>
            <h3 style={{ fontSize: '22px', fontWeight: '700' }}>Waiting for high-value intent...</h3>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '24px' }}>
            {leads.map((lead) => (
              <div key={lead.id} className="glass" style={{ padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: '800' }}>{lead.customer_phone}</h4>
                  <span style={{ fontSize: '10px', padding: '4px 8px', background: lead.sentiment === 'positive' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)', color: lead.sentiment === 'positive' ? '#10b981' : '#888', borderRadius: '8px', fontWeight: 800 }}>
                    {lead.sentiment?.toUpperCase()}
                  </span>
                </div>
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', fontSize: '14px', lineHeight: '1.6' }}>
                  "{lead.summary}"
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Intent: <b>{lead.intent}</b></div>
                   <div style={{ fontSize: '18px', fontWeight: 900, color: '#10b981' }}>${Number(lead.value_estimate).toLocaleString()}</div>
                </div>
                <Link href={`/dashboard/chat?phone=${lead.customer_phone}`} className="glow-btn" style={{ textAlign: 'center', padding: '12px', borderRadius: '12px', background: '#fff', color: '#000', fontSize: '14px', textDecoration: 'none' }}>
                  OPEN CHAT
                </Link>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ── LIVE ACTIVITY FEED ── */
        <div className="glass" style={{ padding: '0', borderRadius: '32px', overflow: 'hidden', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
          <div style={{ padding: '20px 30px', background: 'rgba(59, 130, 246, 0.05)', borderBottom: '1px solid rgba(59, 130, 246, 0.1)', display: 'flex', justifyContent: 'space-between' }}>
             <span style={{ fontSize: '12px', fontWeight: 800, color: '#3b82f6' }}>SYSTEM LOGS</span>
             <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Real-time updates active</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {activity.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', opacity: 0.3 }}>Awaiting first signal...</div>
            ) : (
              activity.map((log, i) => (
                <div key={i} style={{ 
                  padding: '20px 30px', 
                  borderBottom: '1px solid rgba(255,255,255,0.03)', 
                  display: 'flex', 
                  gap: '20px', 
                  alignItems: 'flex-start',
                  background: i === 0 ? 'rgba(59, 130, 246, 0.02)' : 'transparent'
                }}>
                  <div style={{ fontSize: '20px' }}>
                    {log.event_type === 'scrape' ? '🔎' : log.event_type === 'tool_call' ? '💎' : log.event_type === 'intent' ? '🔥' : '⚙️'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', lineHeight: '1.5' }}>{log.message}</p>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                      <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                      {log.contact_phone && <span style={{ color: '#3b82f6' }}>• {log.contact_phone}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </main>
  );
}
