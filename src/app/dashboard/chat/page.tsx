'use client';

import React, { useState, useEffect } from 'react';
import { getActiveSessions, toggleBotForCustomer } from './actions';

export default function ChatMonitorPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    const res = await getActiveSessions();
    if (res.success) setSessions(res.sessions || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000); // Polling every 5s for 'live' effect
    return () => clearInterval(interval);
  }, []);

  const handleTakeOver = async (customerPhone: string) => {
    if (!confirm('Are you sure you want to take over? This will stop the bot from replying to this customer.')) return;
    const res = await toggleBotForCustomer(customerPhone, false);
    if (res.success) {
      setSessions(sessions.map(s => s.customer_phone === customerPhone ? { ...s, bot_disabled: true } : s));
      alert(`🛰️ Bot paused for ${customerPhone}. You are now in control.`);
    } else {
      alert('❌ Failed to take over.');
    }
  };

  const getStatusBadge = (step: string) => {
    if (!step) return { label: 'Idle 💤', color: 'rgba(255,255,255,0.1)' };
    if (step.includes('order')) return { label: 'Ordering 🍕', color: 'rgba(255,165,0,0.2)' };
    if (step.includes('track')) return { label: 'Tracking 📦', color: 'rgba(0,212,255,0.2)' };
    if (step.includes('book')) return { label: 'Booking 📅', color: 'rgba(0,255,136,0.2)' };
    return { label: 'Talking 💬', color: 'rgba(255,255,255,0.1)' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingTop: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', background: 'linear-gradient(135deg,#fff,#888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🛰️ Live Sales Monitor
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>Watch your bot interact with customers in real-time. Jump in anytime.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '12px', background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.1)', fontSize: '12px', color: '#00ff88', fontWeight: 700 }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00ff88', animation: 'pulse 1.5s infinite' }} />
          LIVE RADAR ACTIVE
        </div>
      </header>

      <div className="glass" style={{ borderRadius: '32px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '24px', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Customer</th>
              <th style={{ padding: '24px', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '24px', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Conversation Intelligence</th>
              <th style={{ padding: '24px', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => {
              const status = getStatusBadge(s.current_step);
              const isHandledByBot = !s.bot_disabled;
              return (
                <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: isHandledByBot ? 'transparent' : 'rgba(255,68,68,0.02)' }}>
                  <td style={{ padding: '24px' }}>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{s.customer_phone}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                       ⏱️ {new Date(s.created_at).toLocaleTimeString()}
                    </div>
                  </td>
                  <td style={{ padding: '24px' }}>
                    <span style={{ 
                      padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, 
                      background: status.color, border: '1px solid rgba(255,255,255,0.05)', color: '#fff'
                    }}>
                      {status.label}
                    </span>
                  </td>
                  <td style={{ padding: '24px' }}>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', maxWidth: '400px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ fontSize: '16px' }}>{s.role === 'assistant' ? '🤖' : '👤'}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.content}</span>
                    </div>
                  </td>
                  <td style={{ padding: '24px' }}>
                    {isHandledByBot ? (
                      <button 
                        onClick={() => handleTakeOver(s.customer_phone)}
                        style={{ 
                          background: 'rgba(255,68,68,0.05)', 
                          color: '#ff4444', 
                          border: '1px solid rgba(255,68,68,0.1)', 
                          padding: '8px 20px', 
                          borderRadius: '12px', 
                          fontSize: '11px', 
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        TAKE OVER
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#ff4444' }}>🛑 BOT PAUSED</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {sessions.length === 0 && !loading && (
              <tr>
                <td colSpan={4} style={{ padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>
                  No active conversations found right now. 💤
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
