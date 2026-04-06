'use client';

import React, { useState, useEffect } from 'react';
import { getAllTenants } from '../actions';

export default function AdminUsersPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const res = await getAllTenants();
      if (res.success) setTenants(res.tenants || []);
      setLoading(false);
    })();
  }, []);

  const filtered = tenants.filter(t =>
    (t.business_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner-small" style={{ width: '40px', height: '40px', margin: '0 auto 20px' }} />
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Loading Tenant Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '80px' }}>
      <header>
        <h1 style={{ fontSize: '30px', fontWeight: 800, marginBottom: '8px', background: 'linear-gradient(135deg, #fff, #888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          👥 Tenant Management
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
          {tenants.length} registered merchants on the ChatSela platform.
        </p>
      </header>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Search by business name or user..."
        style={{
          padding: '14px 20px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          color: '#fff',
          outline: 'none',
          fontSize: '14px',
          width: '100%',
          maxWidth: '500px',
          fontFamily: 'Inter, sans-serif',
        }}
      />

      {/* Tenants Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
        {filtered.map((t: any) => (
          <div key={t.id} style={{
            padding: '24px',
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            transition: 'all 0.2s',
          }} className="glass-hover">
            {/* Tenant Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>
                  {t.business_name || 'Unnamed Business'}
                  {t.is_admin && <span style={{ marginLeft: '8px', fontSize: '10px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>ADMIN</span>}
                </h3>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{t.full_name || 'No name set'}</p>
              </div>
              <span style={{
                padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 700,
                background: t.whatsappConnected ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.05)',
                color: t.whatsappConnected ? '#00ff88' : 'rgba(255,255,255,0.3)',
              }}>
                {t.whatsappConnected ? '🟢 LIVE' : '⚪ OFFLINE'}
              </span>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ fontSize: '18px', fontWeight: 800, color: '#3b82f6' }}>{t.kbFactCount}</p>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>KB Facts</p>
              </div>
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ fontSize: '18px', fontWeight: 800, color: '#f97316' }}>{t.messageCount}</p>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>Messages</p>
              </div>
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ fontSize: '18px', fontWeight: 800, color: t.bot ? '#00ff88' : '#ef4444' }}>{t.bot ? '✅' : '❌'}</p>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>Bot</p>
              </div>
            </div>

            {/* Bot Info */}
            {t.bot && (
              <div style={{ padding: '12px', background: 'rgba(0,255,136,0.03)', borderRadius: '12px', border: '1px solid rgba(0,255,136,0.08)' }}>
                <p style={{ fontSize: '12px', fontWeight: 600 }}>🤖 {t.bot.name}</p>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>Status: {t.bot.status || 'active'} · Currency: {t.base_currency || 'USD'}</p>
              </div>
            )}

            {/* Footer */}
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: 'auto' }}>
              Joined: {new Date(t.created_at).toLocaleDateString()} · Tier: {t.billing_tier || 'starter'}
            </p>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', opacity: 0.4 }}>
          <p style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</p>
          <p>No tenants match your search.</p>
        </div>
      )}
    </div>
  );
}
