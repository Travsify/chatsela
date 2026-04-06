'use client';

import React, { useState, useEffect } from 'react';
import { 
  validateConnection, 
  syncStoreData,
  getWidgetSettings,
  saveWidgetSettings,
  verifySnippetConnection
} from './actions';

const PLATFORMS = [
  { id: 'shopify', name: 'Shopify', logo: '🛍️', color: '#95BF47', desc: 'Deep-sync products and orders via Admin API.' },
  { id: 'woocommerce', name: 'WooCommerce', logo: '🛒', color: '#7FB13D', desc: 'Connect your store via REST API keys.' },
  { id: 'custom', name: 'Universal Snippet', logo: '🌐', color: '#00ff88', desc: 'No-code real-time sync for any website or platform.' },
];

const CARD_STYLE = {
  flex: '1',
  minWidth: '280px',
  padding: '32px',
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

const CODE_STYLE: React.CSSProperties = {
  background: '#151515',
  color: '#25D366',
  padding: '20px',
  borderRadius: '14px',
  fontSize: '12px',
  fontFamily: 'monospace',
  lineHeight: '1.6',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
  border: '1px solid rgba(37,211,102,0.1)'
};

export default function ConnectStorePage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [method, setMethod] = useState<'api' | 'snippet' | null>(null);
  
  const [storeUrl, setStoreUrl] = useState('');
  const [token, setToken] = useState('');
  const [secret, setSecret] = useState('');
  
  const [widgetSettings, setWidgetSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await getWidgetSettings();
      if (res.success) setWidgetSettings(res.settings);
    })();
  }, []);

  const handleConnectAPI = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);

    const res = await validateConnection(selected, storeUrl, token, secret);
    if (res.success) {
      setSuccess(true);
      await syncStoreData(selected);
    } else {
      setError(res.error || 'Connection failed.');
    }
    setLoading(false);
  };

  const handleToggleIcon = async () => {
    if (!widgetSettings) return;
    const next = !widgetSettings.widget_icon_enabled;
    setWidgetSettings({ ...widgetSettings, widget_icon_enabled: next });
    await saveWidgetSettings(next);
  };

  const handleVerifySnippet = async () => {
    setIsVerifying(true);
    const res = await verifySnippetConnection();
    if (res.success) {
      setWidgetSettings({ ...widgetSettings, snippet_verified_at: res.last_seen });
      alert('✅ Bridge Verified! Your website is now pushing data to ChatSela.');
    } else {
      alert(`❌ ${res.error}`);
    }
    setIsVerifying(false);
  };

  const copySnippet = () => {
    if (!widgetSettings) return;
    const phone = widgetSettings.whatsapp_phone || 'YOUR_PHONE';
    const code = `<script src="${window.location.origin}/widget.js?key=${widgetSettings.api_key}&icon=${widgetSettings.widget_icon_enabled}&phone=${phone}"></script>`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px' }}>
      
      <header style={{ marginBottom: '48px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '38px', fontWeight: 800, marginBottom: '12px', background: 'linear-gradient(to right, #fff, #888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🔌 Connect Your Website</h1>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.4)' }}>Unify your web storefront with your High-Conversion Sales Engine.</p>
      </header>

      {/* ── 1. Select Platform ── */}
      {!selected && (
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {PLATFORMS.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelected(p.id)}
              style={{
                ...CARD_STYLE,
                background: 'rgba(255,255,255,0.02)',
                borderColor: 'rgba(255,255,255,0.05)',
              }}
              className="glass-hover"
            >
              <div style={{ fontSize: '48px' }}>{p.logo}</div>
              <h3 style={{ fontSize: '20px', fontWeight: 700 }}>{p.name}</h3>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.6' }}>{p.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── 2. Select Method (Only for Shopify/WooC) ── */}
      {selected && selected !== 'custom' && !method && !success && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
          <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '14px' }}>← Back to Platforms</button>
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>How would you like to connect?</h2>
          <div style={{ display: 'flex', gap: '20px', width: '100%', maxWidth: '800px' }}>
            <div onClick={() => setMethod('api')} style={{ ...CARD_STYLE, background: 'rgba(255,255,255,0.02)' }} className="glass-hover">
              <div style={{ fontSize: '32px' }}>🏗️</div>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Deep API Sync</h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Pull your entire catalog and sync orders via API keys. Best for full automation.</p>
            </div>
            <div onClick={() => setMethod('snippet')} style={{ ...CARD_STYLE, background: 'rgba(37,211,102,0.05)', borderColor: 'rgba(37,211,102,0.1)' }} className="glass-hover">
              <div style={{ fontSize: '32px' }}>📎</div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#25D366' }}>Universal Snippet</h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Copy and paste a code tag. Enables real-time page sync and a floating WhatsApp icon.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── 3A. API Connection Flow ── */}
      {selected && method === 'api' && !success && (
        <section className="glass" style={{ padding: '40px', borderRadius: '32px', maxWidth: '600px', margin: '0 auto' }}>
          <button onClick={() => setMethod(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '12px', marginBottom: '20px' }}>← Change Method</button>
          <h2 style={{ fontSize: '22px', marginBottom: '24px' }}>{selected === 'shopify' ? 'Shopify' : 'WooCommerce'} API Keys</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Store URL</label>
              <input type="text" placeholder="yourstore.myshopify.com" value={storeUrl} onChange={e => setStoreUrl(e.target.value)} style={INPUT_STYLE} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{selected === 'shopify' ? 'Admin API Access Token' : 'Consumer Key'}</label>
              <input type="password" placeholder="shpat_..." value={token} onChange={e => setToken(e.target.value)} style={INPUT_STYLE} />
            </div>
            {selected === 'woocommerce' && (
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Consumer Secret</label>
                <input type="password" placeholder="cs_..." value={secret} onChange={e => setSecret(e.target.value)} style={INPUT_STYLE} />
              </div>
            )}
            <button 
              onClick={handleConnectAPI}
              disabled={loading || !storeUrl || !token}
              style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'var(--grad-primary)', color: '#000', fontWeight: 700, cursor: 'pointer', border: 'none' }}
            >
              {loading ? '⏳ Synchronizing...' : `Connect ${selected === 'shopify' ? 'Shopify' : 'WooCommerce'}`}
            </button>
            {error && <p style={{ color: '#ff4d4d', fontSize: '13px', textAlign: 'center' }}>⚠️ {error}</p>}
          </div>
        </section>
      )}

      {/* ── 3B. Universal Snippet Flow (Also for 'Custom') ── */}
      {(method === 'snippet' || selected === 'custom') && !success && (
        <section className="glass" style={{ padding: '40px', borderRadius: '32px', maxWidth: '800px', margin: '0 auto' }}>
          {selected !== 'custom' && <button onClick={() => setMethod(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '12px', marginBottom: '20px' }}>← Change Method</button>}
          {selected === 'custom' && <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '12px', marginBottom: '20px' }}>← Back to Platforms</button>}
          
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Smart Website Snippet</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginBottom: '32px' }}>Paste this code into the <b>Head</b> or <b>Footer</b> of your website to enable God-Mode Sync.</p>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#25D366' }}>WIDGET CODE (v2)</span>
              <button 
                onClick={copySnippet}
                style={{ background: copied ? '#25D366' : 'rgba(255,255,255,0.1)', color: copied ? '#000' : '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              >
                {copied ? '✅ COPIED' : 'COPY'}
              </button>
            </div>
            <div style={CODE_STYLE}>
              {`<script src="${window.location.origin}/widget.js?key=${widgetSettings?.api_key || 'GENERATING...'}&icon=${widgetSettings?.widget_icon_enabled || 'false'}&phone=${widgetSettings?.whatsapp_phone || 'YOUR_PHONE'}"></script>`}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                 <h4 style={{ fontSize: '15px' }}>💬 Floating WhatsApp Icon</h4>
                 <div 
                   onClick={handleToggleIcon}
                   style={{ width: '44px', height: '24px', background: widgetSettings?.widget_icon_enabled ? '#25D366' : '#333', borderRadius: '12px', position: 'relative', cursor: 'pointer' }}
                 >
                   <div style={{ width: '18px', height: '18px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '3px', left: widgetSettings?.widget_icon_enabled ? '23px' : '3px', transition: 'all 0.2s' }} />
                 </div>
               </div>
               <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5' }}>Show a high-conversion floating button on your site that directly opens a chat with your bot.</p>
            </div>
            <div style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
               <h4 style={{ fontSize: '15px', marginBottom: '12px' }}>🛡️ Connection Status</h4>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                 <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: widgetSettings?.snippet_verified_at ? '#25D366' : '#ef4444' }} />
                 <span style={{ fontSize: '13px', fontWeight: 600, color: widgetSettings?.snippet_verified_at ? '#25D366' : '#ef4444' }}>
                   {widgetSettings?.snippet_verified_at ? 'VERIFIED & SYNCING' : 'NOT DETECTED'}
                 </span>
               </div>
               <button 
                 onClick={handleVerifySnippet} 
                 disabled={isVerifying}
                 style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
               >
                 {isVerifying ? '⌛ Checking...' : 'Verify Installation'}
               </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Success State ── */}
      {success && (
        <section className="glass" style={{ padding: '60px', borderRadius: '32px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>✨</div>
          <h2 style={{ fontSize: '28px', marginBottom: '12px' }}>Deep Sync Successful!</h2>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', marginBottom: '40px' }}>Your platform is now unified with ChatSela. Your bot is smarter, faster, and ready to sell.</p>
          <button 
            onClick={() => window.location.href = '/dashboard'}
            style={{ background: 'var(--grad-primary)', border: 'none', color: '#000', padding: '16px 40px', borderRadius: '16px', cursor: 'pointer', fontWeight: 700 }}
          >
            Go to Bot Dashboard
          </button>
        </section>
      )}

      <style>{`
        .glass { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); backdrop-filter: blur(10px); }
        .glass-hover:hover { background: rgba(255,255,255,0.05) !important; transform: translateY(-4px); }
      `}</style>
    </div>
  );
}
