'use client';

import React, { useState, useEffect } from 'react';
import { getGlobalMetrics, getRecentActivity } from './actions';

const CARD_STYLE: React.CSSProperties = {
  padding: '24px',
  borderRadius: '20px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const METRIC_STYLE: React.CSSProperties = {
  fontSize: '36px',
  fontWeight: 800,
  fontFamily: 'Outfit',
  background: 'linear-gradient(135deg, #fff, #aaa)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [m, a] = await Promise.all([getGlobalMetrics(), getRecentActivity()]);
      if (m.success) setMetrics(m.metrics);
      if (a.success) setActivity(a);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner-small" style={{ width: '40px', height: '40px', margin: '0 auto 20px' }} />
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Loading Platform Intelligence...</p>
        </div>
      </div>
    );
  }

  const sentimentTotal = (metrics?.sentimentBreakdown?.positive || 0) + (metrics?.sentimentBreakdown?.neutral || 0) + (metrics?.sentimentBreakdown?.negative || 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '80px' }}>
      {/* Header */}
      <header>
        <h1 style={{ fontSize: '34px', fontWeight: 800, marginBottom: '8px', background: 'linear-gradient(135deg, #ef4444, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🛡️ God-Mode Command Center
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
          Real-time global metrics across all ChatSela tenants. Last updated: {new Date().toLocaleTimeString()}.
        </p>
      </header>

      {/* Top-Level Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ ...CARD_STYLE, borderLeft: '4px solid #3b82f6' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Total Users</span>
          <span style={METRIC_STYLE}>{metrics?.totalUsers}</span>
          <span style={{ fontSize: '11px', color: '#3b82f6' }}>Registered Merchants</span>
        </div>
        <div style={{ ...CARD_STYLE, borderLeft: '4px solid #00ff88' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Active Bots</span>
          <span style={METRIC_STYLE}>{metrics?.totalBots}</span>
          <span style={{ fontSize: '11px', color: '#00ff88' }}>Deployed AI Agents</span>
        </div>
        <div style={{ ...CARD_STYLE, borderLeft: '4px solid #a78bfa' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>WhatsApp Live</span>
          <span style={METRIC_STYLE}>{metrics?.activeSessions}</span>
          <span style={{ fontSize: '11px', color: '#a78bfa' }}>Connected Devices</span>
        </div>
        <div style={{ ...CARD_STYLE, borderLeft: '4px solid #f97316' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Total Messages</span>
          <span style={METRIC_STYLE}>{metrics?.totalMessages?.toLocaleString()}</span>
          <span style={{ fontSize: '11px', color: '#f97316' }}>AI Conversations</span>
        </div>
      </div>

      {/* Intelligence Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ ...CARD_STYLE, borderLeft: '4px solid #06b6d4' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Knowledge Vault</span>
          <span style={METRIC_STYLE}>{metrics?.totalKBFacts?.toLocaleString()}</span>
          <span style={{ fontSize: '11px', color: '#06b6d4' }}>Verified Facts (Global)</span>
        </div>
        <div style={{ ...CARD_STYLE, borderLeft: '4px solid #ef4444' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Pending Gaps</span>
          <span style={METRIC_STYLE}>{metrics?.pendingGaps}</span>
          <span style={{ fontSize: '11px', color: '#ef4444' }}>Unanswered Questions</span>
        </div>
        <div style={{ ...CARD_STYLE, borderLeft: '4px solid #22c55e' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Service Ledger</span>
          <span style={METRIC_STYLE}>{metrics?.totalServices}</span>
          <span style={{ fontSize: '11px', color: '#22c55e' }}>Verified Pricing Entries</span>
        </div>
        <div style={{ ...CARD_STYLE, borderLeft: '4px solid #eab308' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Sales Pipeline</span>
          <span style={METRIC_STYLE}>${metrics?.totalPipelineValue?.toLocaleString()}</span>
          <span style={{ fontSize: '11px', color: '#eab308' }}>Estimated Global Revenue</span>
        </div>
      </div>

      {/* Sentiment Breakdown */}
      {sentimentTotal > 0 && (
        <section style={{ ...CARD_STYLE, padding: '28px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>🎭 Global Customer Sentiment</h3>
          <div style={{ display: 'flex', gap: '4px', height: '32px', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ flex: metrics?.sentimentBreakdown?.positive || 1, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#000' }}>
              😊 {metrics?.sentimentBreakdown?.positive || 0}
            </div>
            <div style={{ flex: metrics?.sentimentBreakdown?.neutral || 1, background: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#000' }}>
              😐 {metrics?.sentimentBreakdown?.neutral || 0}
            </div>
            <div style={{ flex: metrics?.sentimentBreakdown?.negative || 1, background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff' }}>
              😠 {metrics?.sentimentBreakdown?.negative || 0}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
            <span>Positive ({Math.round((metrics?.sentimentBreakdown?.positive / sentimentTotal) * 100)}%)</span>
            <span>Neutral ({Math.round((metrics?.sentimentBreakdown?.neutral / sentimentTotal) * 100)}%)</span>
            <span>Negative ({Math.round((metrics?.sentimentBreakdown?.negative / sentimentTotal) * 100)}%)</span>
          </div>
        </section>
      )}

      {/* Recent Knowledge Gaps (Global) */}
      <section style={{ ...CARD_STYLE, padding: '28px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>🔔 Recent Knowledge Gaps (All Tenants)</h3>
        {activity?.recentGaps?.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>No knowledge gaps detected across the platform. All bots are fully trained! 🎉</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
          {activity?.recentGaps?.map((gap: any) => (
            <div key={gap.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px', borderRadius: '14px',
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${gap.status === 'pending' ? 'rgba(239,68,68,0.15)' : 'rgba(0,255,136,0.1)'}`,
              borderLeft: `4px solid ${gap.status === 'pending' ? '#ef4444' : '#00ff88'}`
            }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600 }}>❓ {gap.question}</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>
                  {gap.profiles?.business_name || 'Unknown'} · {gap.customer_phone} · {new Date(gap.created_at).toLocaleString()}
                </p>
                {gap.answer && <p style={{ fontSize: '12px', color: '#00ff88', marginTop: '4px' }}>✅ {gap.answer}</p>}
              </div>
              <span style={{
                padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 700,
                background: gap.status === 'pending' ? 'rgba(239,68,68,0.1)' : 'rgba(0,255,136,0.1)',
                color: gap.status === 'pending' ? '#ef4444' : '#00ff88'
              }}>
                {gap.status?.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Insights (Global) */}
      <section style={{ ...CARD_STYLE, padding: '28px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>📈 Recent Sales Insights (All Tenants)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
          {activity?.recentInsights?.map((insight: any) => (
            <div key={insight.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px', borderRadius: '14px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: 600 }}>{insight.summary?.substring(0, 100) || 'No summary'}</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>
                  {insight.profiles?.business_name || 'Unknown'} · {insight.customer_phone}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', fontWeight: 700,
                  background: insight.sentiment === 'positive' ? 'rgba(34,197,94,0.1)' : insight.sentiment === 'negative' ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.1)',
                  color: insight.sentiment === 'positive' ? '#22c55e' : insight.sentiment === 'negative' ? '#ef4444' : '#eab308',
                }}>
                  {insight.sentiment}
                </span>
                {insight.value_estimate > 0 && (
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#eab308', marginTop: '6px' }}>${insight.value_estimate}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
