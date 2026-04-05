'use client';

import React, { useState, useEffect } from 'react';
import { getMerchantKeysStatus, saveMerchantKeys, testMerchantConnection } from './actions';

const INPUT_STYLE = {
  padding: '12px 18px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  color: '#fff',
  fontSize: '15px',
  width: '100%',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const BORDER_ACCENT = 'linear-gradient(to right, #00ff88, #00d4ff)';

export default function MerchantPaymentsPage() {
  const [paystackKey, setPaystackKey] = useState('');
  const [stripeKey, setStripeKey] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      const res = await getMerchantKeysStatus();
      if (res.success) {
        setStatus(res);
        setCurrency(res.currency || 'USD');
      }
    })();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setMsg('');
    const res = await saveMerchantKeys({ paystackSecret: paystackKey, stripeSecret: stripeKey, currency });
    if (res.success) {
      setMsg('✅ Settings saved and encrypted successfully!');
      setPaystackKey('');
      setStripeKey('');
      const newStatus = await getMerchantKeysStatus();
      setStatus(newStatus);
    } else {
      setMsg(`❌ Error: ${res.error}`);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingTop: '40px' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', background: 'linear-gradient(to right, #fff, #aaa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>💸 Payment Settings</h1>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)' }}>Connect your own payment gateway. Money goes directly to you.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '60px' }}>
        
        {/* ── Paystack Configuration ─────────────────────────────────────── */}
        <section className="glass" style={{ padding: '32px', borderRadius: '24px', position: 'relative', borderTop: '2px solid #09A5DB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
             <h3 style={{ fontSize: '20px', fontWeight: 700 }}>🦅 Paystack</h3>
             <span style={{ fontSize: '11px', color: status?.hasPaystack ? '#00ff88' : '#ffaa00', fontWeight: 700 }}>
                {status?.hasPaystack ? '● CONNECTED' : '○ DISCONNECTED'}
             </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Secret Key (Encrypted)</label>
            <input 
              type="password" 
              placeholder={status?.hasPaystack ? '••••••••••••••••' : 'sk_live_...'} 
              style={INPUT_STYLE}
              value={paystackKey}
              onChange={(e) => setPaystackKey(e.target.value)}
            />
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>Used for Naira (NGN), Cedis (GHS), and Rand (ZAR) transactions.</p>
          </div>
        </section>

        {/* ── Stripe Configuration ───────────────────────────────────────── */}
        <section className="glass" style={{ padding: '32px', borderRadius: '24px', position: 'relative', borderTop: '2px solid #635bff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
             <h3 style={{ fontSize: '20px', fontWeight: 700 }}>💳 Stripe</h3>
             <span style={{ fontSize: '11px', color: status?.hasStripe ? '#00ff88' : '#ffaa00', fontWeight: 700 }}>
                {status?.hasStripe ? '● CONNECTED' : '○ DISCONNECTED'}
             </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Secret Key (Encrypted)</label>
            <input 
              type="password" 
              placeholder={status?.hasStripe ? '••••••••••••••••' : 'sk_live_...'} 
              style={INPUT_STYLE}
              value={stripeKey}
              onChange={(e) => setStripeKey(e.target.value)}
            />
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>Used for Global USD, EUR, and GBP payments.</p>
          </div>
        </section>

      </div>

      {/* ── Common Settings ────────────────────────────────────────────── */}
      <section className="glass" style={{ padding: '40px', borderRadius: '32px', marginBottom: '40px' }}>
         <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '30px' }}>⚙️ Global Payment Config</h3>
         <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
           <div>
             <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '10px' }}>Primary Currency</label>
             <select 
               style={{ ...INPUT_STYLE, background: 'rgba(255,255,255,0.02)', color: '#fff' }} 
               value={currency}
               onChange={(e) => setCurrency(e.target.value)}
             >
               <option value="USD">🇺🇸 USD (Dollars)</option>
               <option value="NGN">🇳🇬 NGN (Naira)</option>
               <option value="GBP">🇬🇧 GBP (Pounds)</option>
               <option value="EUR">🇪🇺 EUR (Euros)</option>
             </select>
           </div>

           <div style={{ padding: '24px', background: 'rgba(0,255,136,0.03)', borderRadius: '16px', border: '1px solid rgba(0,255,136,0.1)' }}>
              <h4 style={{ fontSize: '14px', color: '#00ff88', marginBottom: '8px' }}>🚀 One final step: Your Webhook URL</h4>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6', marginBottom: '12px' }}>
                For ChatSela to automatically confirm payments on WhatsApp, you **MUST** paste this URL into both your Paystack and Stripe dashboard's Webhook settings:
              </p>
              <div style={{ padding: '12px 18px', background: '#000', borderRadius: '10px', fontSize: '13px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'copy', color: '#fff' }}>
                <code>{process.env.NEXT_PUBLIC_SITE_URL || 'https://chatsela.app'}/api/webhook/payments</code>
              </div>
           </div>

           <button 
             onClick={handleSave}
             disabled={loading}
             style={{ 
               background: BORDER_ACCENT, color: '#000', fontWeight: 800, padding: '16px', borderRadius: '16px', border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1, marginTop: '20px'
             }}
           >
             {loading ? '🔐 Encrypting & Saving...' : 'Save Payment Settings'}
           </button>

           {msg && <p style={{ textAlign: 'center', fontSize: '14px', color: msg.includes('✅') ? '#00ff88' : '#ff4d4d' }}>{msg}</p>}
         </div>
      </section>

      <style>{`
        .glass { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(10px); }
      `}</style>
    </div>
  );
}
