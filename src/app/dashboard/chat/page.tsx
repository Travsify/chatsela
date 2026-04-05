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

  const getStatusBadge = (step: string) => {
    if (!step) return { label: 'Idle 💤', color: 'rgba(255,255,255,0.1)' };
    if (step.includes('order')) return { label: 'Ordering 🍕', color: 'rgba(255,165,0,0.2)' };
    if (step.includes('track')) return { label: 'Tracking 📦', color: 'rgba(0,212,255,0.2)' };
    if (step.includes('book')) return { label: 'Booking 📅', color: 'rgba(0,255,136,0.2)' };
    return { label: 'Talking 💬', color: 'rgba(255,255,255,0.1)' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingTop: '40px' }}>
      <header>
        <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>🛰️ Live Sales Monitor</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Watch your bot interact with customers in real-time. Jump in anytime.</p>
      </header>

      <div className="glass" style={{ borderRadius: '24px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '20px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Customer</th>
              <th style={{ padding: '20px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '20px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Last Message</th>
              <th style={{ padding: '20px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => {
              const status = getStatusBadge(s.current_step);
              return (
                <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '20px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{s.customer_phone}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Last active: {new Date(s.created_at).toLocaleTimeString()}</div>
                  </td>
                  <td style={{ padding: '20px' }}>
                    <span style={{ 
                      padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, 
                      background: status.color, border: '1px solid rgba(255,255,255,0.1)' 
                    }}>
                      {status.label}
                    </span>
                  </td>
                  <td style={{ padding: '20px' }}>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.role === 'assistant' ? '🤖 ' : '👤 '} {s.content}
                    </div>
                  </td>
                  <td style={{ padding: '20px' }}>
                    <button 
                      onClick={() => toggleBotForCustomer(s.customer_phone, false)}
                      style={{ background: 'rgba(255,60,60,0.1)', color: '#ff6b6b', border: '1px solid rgba(255,60,60,0.2)', padding: '6px 16px', borderRadius: '10px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Pause Bot (Take Over)
                    </button>
                  </td>
                </tr>
              );
            })}
            {sessions.length === 0 && !loading && (
              <tr>
                <td colSpan={4} style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
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
