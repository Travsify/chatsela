'use client';

import React, { useState } from 'react';
import { validateConnection, syncStoreData } from './actions';

const PLATFORMS = [
  { id: 'shopify', name: 'Shopify', logo: '🛍️', color: '#95BF47', desc: 'Sync your products, orders, and tracking in one click.' },
  { id: 'woocommerce', name: 'WooCommerce', logo: '🛒', color: '#7FB13D', desc: 'The most popular open-source e-commerce platform.' },
  { id: 'custom', name: 'Custom Site', logo: '🌐', color: '#3A86FF', desc: 'Connect any website with our smart crawler or API.' },
];

const CARD_STYLE = {
  flex: '1',
  minWidth: '240px',
  padding: '28px',
  borderRadius: '24px',
  border: '1px solid rgba(255,255,255,0.08)',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '16px',
};

const INPUT_STYLE = {
  padding: '14px 18px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px',
  color: '#fff',
  fontSize: '15px',
  width: '100%',
  outline: 'none',
  transition: 'border-color 0.2s',
};

export default function ConnectStorePage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [storeUrl, setStoreUrl] = useState('');
  const [token, setToken] = useState('');
  const [secret, setSecret] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleConnect = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);

    const res = await validateConnection(selected, storeUrl, token, secret);
    if (res.success) {
      setSuccess(true);
      // Wait a moment then sync
      await syncStoreData(selected);
    } else {
      setError(res.error || 'Connection failed. Please check your credentials.');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingTop: '40px' }}>
      
      <header style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '12px', background: 'linear-gradient(to right, #fff, #888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🔌 Connect Your Website</h1>
        <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.5)' }}>Sync your catalog to ChatSela once and let our AI handle the rest.</p>
      </header>

      {/* ── Platform Selection ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '60px' }}>
        {PLATFORMS.map((p) => (
          <div
            key={p.id}
            onClick={() => { setSelected(p.id); setSuccess(false); setError(null); }}
            style={{
              ...CARD_STYLE,
              background: selected === p.id ? `linear-gradient(135deg, ${p.color}15, transparent)` : 'rgba(255,255,255,0.02)',
              borderColor: selected === p.id ? p.color : 'rgba(255,255,255,0.08)',
              transform: selected === p.id ? 'translateY(-6px)' : 'none',
              boxShadow: selected === p.id ? `0 10px 40px ${p.color}30` : 'none',
            }}
          >
            <div style={{ fontSize: '48px' }}>{p.logo}</div>
            <h3 style={{ fontSize: '20px', fontWeight: 700 }}>{p.name}</h3>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.6' }}>{p.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Wizard ───────────────────────────────────────────────────────── */}
      {selected && !success && (
        <section className="glass" style={{ padding: '40px', borderRadius: '32px', maxWidth: '600px', margin: '0 auto' }}>
  <h2 style={{ fontSize: '24px', marginBottom: '24px' }}>Connect to {PLATFORMS.find(p=>p.id===selected)?.name}</h2>
  
  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
    <div>
      <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{selected === 'custom' ? 'Website URL' : 'Store URL'}</label>
      <input 
        type="text" 
        placeholder={selected === 'custom' ? 'e.g. https://yourbusiness.com' : 'e.g. yourstore.myshopify.com'}
        value={storeUrl}
        onChange={(e) => setStoreUrl(e.target.value)}
        style={INPUT_STYLE} 
      />
    </div>

    {selected !== 'custom' && (
      <>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
            {selected === 'shopify' ? 'Admin API Access Token' : 'Consumer Key'}
          </label>
          <input 
            type="password" 
            placeholder={selected === 'shopify' ? 'shpat_...' : 'ck_...'} 
            value={token}
            onChange={(e) => setToken(e.target.value)}
            style={INPUT_STYLE} 
          />
        </div>

        {selected === 'woocommerce' && (
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Consumer Secret</label>
            <input 
              type="password" 
              placeholder="cs_..." 
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              style={INPUT_STYLE} 
            />
          </div>
        )}
      </>
    )}

    {selected === 'custom' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Website URL (Optional)</label>
          <input 
            type="text" 
            placeholder=" https://yourbusiness.com"
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
            style={INPUT_STYLE} 
          />
        </div>
        
        <div style={{ position: 'relative', textAlign: 'center', margin: '10px 0' }}>
          <hr style={{ border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)' }} />
          <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#0a0a0a', padding: '0 12px', color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontWeight: 700 }}>OR DESCRIBE MANUALLY</span>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>What do you offer?</label>
          <textarea 
            placeholder="e.g. We are a boutique law firm specializing in property and corporate law. We offer 30-min consultations for $100..."
            value={token} // Reusing token field as description for 'custom' to avoid new state
            onChange={(e) => setToken(e.target.value)}
            style={{ ...INPUT_STYLE, height: '100px', resize: 'none' }}
          />
        </div>

        <div style={{ marginTop: '10px', padding: '16px', background: 'rgba(0,255,136,0.03)', borderRadius: '12px', borderLeft: '3px solid #00ff88' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
            <strong>Auto-Architect Mode!</strong> 🤖 Our AI will design your sales bot based on your description.
          </p>
        </div>
      </div>
    )}

    {selected !== 'custom' && (
      <div style={{ marginTop: '10px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', borderLeft: '3px solid var(--accent-primary)' }}>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
          <strong>No code required!</strong> 🔍 {selected === 'shopify' 
            ? 'Go to Settings > Apps > Develop apps > Create an app.' 
            : 'Go to WooCommerce > Settings > Advanced > REST API.'}
        </p>
      </div>
    )}

    <div style={{ padding: '16px', background: 'rgba(255,165,0,0.05)', borderRadius: '12px', border: '1px solid rgba(255,165,0,0.2)' }}>
      <p style={{ fontSize: '12px', color: '#ffaa00' }}>
        💡 <strong>Don't forget:</strong> Add your Paystack/Stripe keys in <a href="/dashboard/settings/payments" style={{ color: '#ffaa00', fontWeight: 700 }}>Payment Settings</a> to start accepting payments!
      </p>
    </div>

    <button 
      onClick={handleConnect}
      disabled={loading || !storeUrl || (selected !== 'custom' && !token)}
      style={{
        width: '100%',
        padding: '16px',
        borderRadius: '16px',
        background: 'linear-gradient(to right, #00ff88, #00d4ff)',
        color: '#000',
        fontWeight: 700,
        fontSize: '16px',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
        border: 'none',
        marginTop: '10px',
      }}
    >
      {loading ? '⏳ Verifying Connection...' : `Connect ${PLATFORMS.find(p=>p.id===selected)?.name}`}
    </button>

            {error && <p style={{ color: '#ff4d4d', fontSize: '14px', textAlign: 'center' }}>⚠️ {error}</p>}
          </div>
        </section>
      )}

      {/* ── Success State ────────────────────────────────────────────────── */}
      {success && (
        <section className="glass" style={{ padding: '60px', borderRadius: '32px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>✨</div>
          <h2 style={{ fontSize: '28px', marginBottom: '12px' }}>Connection Successful!</h2>
          
          {loading ? (
            <>
              <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', marginBottom: '32px' }}>
                We're currently architecting your {selected === 'custom' ? 'service flow' : 'product catalog'}...
              </p>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginBottom: '40px' }}>
                <div style={{ width: '60%', height: '100%', background: 'linear-gradient(to right, #00ff88, #00d4ff)', animation: 'progress 3s infinite ease-in-out' }} />
              </div>
            </>
          ) : (
            <>
              <div style={{ padding: '24px', background: 'rgba(0,255,136,0.08)', borderRadius: '24px', marginBottom: '32px', border: '1px solid rgba(0,255,136,0.2)' }}>
                <p style={{ fontSize: '18px', fontWeight: 600, color: '#00ff88' }}>
                   Sync Complete! 🚀
                </p>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>
                  We've successfully architected your bot with the latest data from your site.
                </p>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button 
                  onClick={() => window.location.href = '/dashboard/settings/payments'}
                  style={{ background: 'linear-gradient(to right, #ffaa00, #ff8800)', border: 'none', color: '#000', padding: '16px 32px', borderRadius: '16px', cursor: 'pointer', fontWeight: 700, fontSize: '16px' }}
                >
                  💳 Configure Payment Keys (Paystack/Stripe)
                </button>
                <button 
                  onClick={() => window.location.href = '/dashboard'}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px 32px', borderRadius: '12px', cursor: 'pointer' }}
                >
                  Go to Dashboard
                </button>
              </div>
            </>
          )}
        </section>
      )}

      <style>{`
        @keyframes progress { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .glass { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(10px); }
      `}</style>
    </div>
  );
}
