import React from 'react';

export default function LeadsPage() {
  return (
    <main style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>📨 Active Leads</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Monitor live conversations and step in when human help is needed.</p>
        </div>
      </header>

      <div className="glass" style={{ padding: '40px', borderRadius: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
        <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>No active leads right now</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>When a customer messages your WhatsApp number, they will appear here.</p>
      </div>
    </main>
  );
}
