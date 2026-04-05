'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function LiveSalesFeed() {
  const [activities, setActivities] = useState<any[]>([]);
  const supabase = createClient();

  const fetchRecent = async () => {
    // 1. Get current user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 2. Get channel_id
    const { data: session } = await supabase
      .from('whatsapp_sessions')
      .select('whapi_channel_id')
      .eq('user_id', user.id)
      .single();

    if (!session?.whapi_channel_id) return;

    // 3. Fetch latest chat_memory for this channel
    // In a production app, we'd use realtime subscriptions here.
    // For now we'll poll or just show the most recent unique sessions.
    const { data, error } = await supabase
      .from('chat_memory')
      .select('*')
      .eq('channel_id', session.whapi_channel_id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return;

    // Group only unique sessions
    const unique: Record<string, any> = {};
    data.forEach(d => {
      if (!unique[d.customer_phone]) unique[d.customer_phone] = d;
    });

    setActivities(Object.values(unique).slice(0, 5));
  };

  useEffect(() => {
    fetchRecent();
    const interval = setInterval(fetchRecent, 10000); // Pulse every 10s
    return () => clearInterval(interval);
  }, []);

  const getStatusLabel = (step: string) => {
    if (!step) return 'Idle';
    if (step.includes('order')) return 'Ordering 🍕';
    if (step.includes('track')) return 'Tracking 📦';
    if (step.includes('book')) return 'Booking 📅';
    return 'Conversing 💬';
  };

  return (
    <aside className="glass" style={{
      width: '320px',
      borderRadius: '24px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      height: 'fit-content',
      position: 'sticky',
      top: '0'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Live Sales Activity</h3>
        <div style={{ width: '8px', height: '8px', background: 'var(--accent-primary)', borderRadius: '50%', boxShadow: '0 0 10px var(--accent-primary)', animation: 'pulse 1.5s infinite' }}></div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {activities.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
            No live sales activity yet. Your bot is standing by. 🤖
          </p>
        ) : (
          activities.map((act, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                {act.current_step?.includes('order') ? '🍕' : act.current_step?.includes('track') ? '📦' : '👤'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{act.customer_phone}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                   <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)' }}>{getStatusLabel(act.current_step)}</span>
                   <p style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.content}</p>
                </div>
              </div>
              <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>{new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))
        )}
      </div>

      <a href="/dashboard/chat" style={{
        marginTop: '10px', textAlign: 'center', fontSize: '12px', fontWeight: 600,
        color: 'var(--accent-primary)', textDecoration: 'none', display: 'block',
        padding: '10px', borderRadius: '12px', background: 'rgba(0,255,136,0.04)',
        border: '1px solid rgba(0,255,136,0.1)'
      }}>
        View Full Monitor →
      </a>

      <style>{`
        @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
      `}</style>
    </aside>
  );
}
