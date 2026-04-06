'use client';

import React, { useState, useEffect } from 'react';
import { getQuoteSettings, saveQuoteSettings, getShippingRates, addShippingRate, deleteShippingRate, testWebhookUrl } from '../bot/actions';

const INPUT_STYLE: React.CSSProperties = {
  padding: '12px 16px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  color: '#fff',
  outline: 'none',
  fontSize: '14px',
  width: '100%',
  fontFamily: 'Inter, sans-serif',
};

const commonSectionStyle: React.CSSProperties = { 
  padding: '28px', 
  borderRadius: '24px', 
  border: '1px solid rgba(255,255,255,0.05)', 
  background: 'rgba(255,255,255,0.02)' 
};

export default function LogisticsPage() {
  const [quoteMode, setQuoteMode] = useState('internal_table');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [rates, setRates] = useState<any[]>([]);
  
  // Rate form states
  const [originZone, setOriginZone] = useState('');
  const [destZone, setDestZone] = useState('');
  const [baseFee, setBaseFee] = useState('');
  const [ratePerKg, setRatePerKg] = useState('');
  const [eta, setEta] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [settingsRes, ratesRes] = await Promise.all([
      getQuoteSettings(),
      getShippingRates()
    ]);

    if (settingsRes.success && settingsRes.settings) {
      setQuoteMode(settingsRes.settings.quote_mode || 'internal_table');
      setWebhookUrl(settingsRes.settings.webhook_url || '');
      setWebhookSecret(settingsRes.settings.webhook_secret || '');
    }

    if (ratesRes.success && ratesRes.rates) {
      setRates(ratesRes.rates);
    }
    setIsLoading(false);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    const res = await saveQuoteSettings({ quote_mode: quoteMode, webhook_url: webhookUrl, webhook_secret: webhookSecret });
    if (res.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setIsSaving(false);
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl) return;
    setTestLoading(true);
    setTestResult(null);
    const res = await testWebhookUrl(webhookUrl, webhookSecret);
    if (res.success) {
      setTestResult({ success: true, message: `Success! Response: ${JSON.stringify(res.response)}` });
    } else {
      setTestResult({ success: false, message: `Failed: ${res.error}` });
    }
    setTestLoading(false);
  };

  const handleAddRate = async () => {
    if (!originZone || !destZone || !ratePerKg) return alert("Origin, Destination, and Rate per KG are required.");
    
    const res = await addShippingRate({
      origin_zone: originZone,
      destination_zone: destZone,
      base_fee: Number(baseFee) || 0,
      rate_per_kg: Number(ratePerKg),
      delivery_time_estimate: eta
    });

    if (res.success) {
      setOriginZone(''); setDestZone(''); setBaseFee(''); setRatePerKg(''); setEta('');
      fetchData();
    } else {
      alert("Error adding rate: " + res.error);
    }
  };

  const handleDeleteRate = async (id: string) => {
    const res = await deleteShippingRate(id);
    if (res.success) fetchData();
  };

  if (isLoading) return <div style={{ padding: '40px', color: '#fff' }}>Loading quotes...</div>;

  return (
    <main style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', gap: '30px', paddingBottom: '100px' }}>
      <header>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', background: 'linear-gradient(135deg,#fff,#888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Logistics Quoting Engine
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Configure how ChatSela calculates deep-logic quotes for your customers.</p>
      </header>

      {/* Mode Control */}
      <section style={commonSectionStyle}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Quoting Architecture</h2>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <div 
            onClick={() => setQuoteMode('internal_table')}
            style={{ 
              flex: 1, padding: '20px', borderRadius: '16px', cursor: 'pointer',
              border: quoteMode === 'internal_table' ? '2px solid #00ff88' : '1px solid rgba(255,255,255,0.1)',
              background: quoteMode === 'internal_table' ? 'rgba(0,255,136,0.05)' : 'rgba(255,255,255,0.02)'
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Internal Logic Engine</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>We automatically calculate shipping quotes using the manual rates you define below.</p>
          </div>

          <div 
            onClick={() => setQuoteMode('external_webhook')}
            style={{ 
              flex: 1, padding: '20px', borderRadius: '16px', cursor: 'pointer',
              border: quoteMode === 'external_webhook' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
              background: quoteMode === 'external_webhook' ? 'rgba(59,130,246,0.05)' : 'rgba(255,255,255,0.02)'
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>External Webhook (API)</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>ChatSela sends a payload to your custom server, and you return the exact quote. Perfect for advanced SaaS/Logistics.</p>
          </div>
        </div>

        {quoteMode === 'external_webhook' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Pricing Webhook URL</label>
              <input style={INPUT_STYLE} value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://api.yourdomain.com/quote" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Webhook Secret (Optional)</label>
              <input style={INPUT_STYLE} type="password" value={webhookSecret} onChange={e => setWebhookSecret(e.target.value)} placeholder="Secret for x-chatsela-signature header" />
            </div>
            
            <div style={{ marginTop: '10px' }}>
              <button 
                onClick={handleTestWebhook}
                disabled={!webhookUrl || testLoading}
                style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', cursor: webhookUrl ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: 600 }}
              >
                {testLoading ? 'Testing...' : 'Test Webhook Connection'}
              </button>
              
              {testResult && (
                <div style={{ 
                  marginTop: '12px', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  backgroundColor: testResult.success ? 'rgba(0,255,136,0.05)' : 'rgba(255,68,68,0.05)',
                  border: `1px solid ${testResult.success ? 'rgba(0,255,136,0.2)' : 'rgba(255,68,68,0.2)'}`,
                  color: testResult.success ? '#00ff88' : '#ff4444',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}>
                  {testResult.message}
                </div>
              )}
            </div>
          </div>
        )}

        <button 
          onClick={handleSaveSettings}
          style={{ marginTop: '24px', padding: '12px 24px', borderRadius: '12px', background: '#fff', color: '#000', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s', width: '200px' }}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
        {saved && <span style={{ marginLeft: '16px', color: '#00ff88', fontSize: '14px' }}>Saved!</span>}
      </section>

      {/* Manual Rates List (Only show if internal is active) */}
      {quoteMode === 'internal_table' && (
        <section style={commonSectionStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Manual Quote Rates</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: '10px', marginBottom: '20px', alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Origin (e.g. USA)</label>
              <input style={INPUT_STYLE} value={originZone} onChange={e => setOriginZone(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Dest. (e.g. UK)</label>
              <input style={INPUT_STYLE} value={destZone} onChange={e => setDestZone(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Base Fee ($)</label>
              <input type="number" style={INPUT_STYLE} value={baseFee} onChange={e => setBaseFee(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Rate/KG ($)</label>
              <input type="number" style={INPUT_STYLE} value={ratePerKg} onChange={e => setRatePerKg(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ETA (e.g. 3 Days)</label>
              <input style={INPUT_STYLE} value={eta} onChange={e => setEta(e.target.value)} />
            </div>
            <button onClick={handleAddRate} style={{ padding: '12px 20px', borderRadius: '12px', background: 'var(--glass-bg)', color: '#fff', fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
              Add
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', textAlign: 'left', fontSize: '13px', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>Route</th>
                <th style={{ padding: '12px' }}>Base Fee</th>
                <th style={{ padding: '12px' }}>Rate/KG</th>
                <th style={{ padding: '12px' }}>ETA</th>
                <th style={{ padding: '12px', width: '60px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rates.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No rates defined yet. Add one above.</td>
                </tr>
              ) : (
                rates.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '14px' }}>
                    <td style={{ padding: '16px 12px' }}>{r.origin_zone} ➡️ {r.destination_zone}</td>
                    <td style={{ padding: '16px 12px' }}>${r.base_fee}</td>
                    <td style={{ padding: '16px 12px' }}>${r.rate_per_kg}</td>
                    <td style={{ padding: '16px 12px' }}>{r.delivery_time_estimate || '-'}</td>
                    <td style={{ padding: '16px 12px' }}>
                      <button onClick={() => handleDeleteRate(r.id)} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer' }}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      )}

    </main>
  );
}
