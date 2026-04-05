import React from 'react';

export default function TrackingPage() {
  return (
    <main style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>📈 Sales Tracking</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>View your revenue graphs and bot performance metrics.</p>
        </div>
      </header>

      <div className="glass" style={{ padding: '40px', borderRadius: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
        <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>No data to display</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>Once your bot makes its first sale, performance graphs will appear here.</p>
      </div>
    </main>
  );
}
