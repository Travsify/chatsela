'use client';

import React, { useState, useEffect } from 'react';
import { 
  getWidgetSettings, 
  saveWidgetSettings, 
  verifySnippetConnection 
} from '../../bot/actions';

const CODE_STYLE: React.CSSProperties = {
  background: '#1e1e1e',
  color: '#dcdcdc',
  padding: '24px',
  borderRadius: '16px',
  fontSize: '13px',
  fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
  lineHeight: '1.6',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
  border: '1px solid rgba(255,255,255,0.08)',
  position: 'relative'
};

const TOGGLE_STYLE = (enabled: boolean): React.CSSProperties => ({
  width: '50px',
  height: '26px',
  background: enabled ? '#25D366' : '#333',
  borderRadius: '13px',
  position: 'relative',
  cursor: 'pointer',
  transition: 'all 0.3s ease'
});

const TOGGLE_DOT_STYLE = (enabled: boolean): React.CSSProperties => ({
  width: '18px',
  height: '18px',
  background: '#fff',
  borderRadius: '50%',
  position: 'absolute',
  top: '4px',
  left: enabled ? '28px' : '4px',
  transition: 'all 0.3s ease',
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
});

export default function SnippetConnectPage() {
  const [settings, setSettings] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; last_seen?: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await getWidgetSettings();
      if (res.success) setSettings(res.settings);
    })();
  }, []);

  const handleToggle = async () => {
    if (!settings) return;
    const next = !settings.widget_icon_enabled;
    setSettings({ ...settings, widget_icon_enabled: next });
    const res = await saveWidgetSettings(next);
    if (!res.success) alert(`Failed to save: ${res.error}`);
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    const res = await verifySnippetConnection();
    setVerifyResult({ success: res.success, last_seen: res.last_seen });
    if (res.success) {
      setSettings({ ...settings, snippet_verified_at: res.last_seen });
    }
    setIsVerifying(false);
  };

  const copyToClipboard = () => {
    if (!settings?.api_key) return;
    const phone = 'YOUR_WHATSAPP_NUMBER'; // This should ideally be fetched from sessions
    const baseUrl = window.location.origin;
    const code = `<!-- ChatSela Website Snippet (God-Mode v2) -->
<script src="${baseUrl}/widget.js?key=${settings.api_key}&icon=${settings.widget_icon_enabled}&phone=${phone}"></script>`;
    
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!settings) return <div style={{ color: 'rgba(255,255,255,0.4)', padding: '40px' }}>⌛ Loading Connection Hub...</div>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px', background: 'linear-gradient(135deg, #25D366, #128C7E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🔌 Connect Your Website
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px' }}>Link your storefront directly to your AI Sales Engine. Copy and paste the snippet below into your website's <b>Head</b> or <b>Footer</b> tag.</p>
      </header>

      <section style={{ background: 'rgba(255,255,255,0.02)', padding: '32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>📋 Installation Snippet</h3>
          <button 
            onClick={copyToClipboard}
            style={{ 
              background: copied ? '#25D366' : 'rgba(255,255,255,0.05)', 
              color: copied ? '#000' : '#fff',
              border: 'none', padding: '8px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' 
            }}
          >
            {copied ? '✅ COPIED' : 'COPY CODE'}
          </button>
        </div>

        <div style={CODE_STYLE}>
          {`<!-- ChatSela Website Snippet (God-Mode v2) -->\n<script src="${window.location.origin}/widget.js?key=${settings.api_key}&icon=${settings.widget_icon_enabled}&phone=CONNECTED_PHONE"></script>`}
        </div>
        
        <div style={{ marginTop: '24px', display: 'flex', gap: '20px' }}>
          <div style={{ flex: 1, padding: '20px', background: 'rgba(37,211,102,0.03)', borderRadius: '16px', border: '1px solid rgba(37,211,102,0.1)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#25D366', marginBottom: '8px' }}>🤖 God-Mode Sync</h4>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5' }}>This snippet automatically extracts product data, pricing, and descriptions as visitors land on your pages. No manual work required.</p>
          </div>
          <div style={{ flex: 1, padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>🚀 Direct Sales Channel</h4>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5' }}>Enabling the floating icon gives your customers a 1-click gateway to speak with your AI bot on WhatsApp.</p>
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Floating Icon Control */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '28px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
             <h3 style={{ fontSize: '16px', fontWeight: 700 }}>💬 WhatsApp Floating Icon</h3>
             <div style={TOGGLE_STYLE(settings.widget_icon_enabled)} onClick={handleToggle}>
               <div style={TOGGLE_DOT_STYLE(settings.widget_icon_enabled)} />
             </div>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5' }}>
            Show a high-conversion floating WhatsApp button at the bottom-right of your website. 
            <b> Clicking it will start a conversation with your bot automatically.</b>
          </p>
        </div>

        {/* Verification Hub */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '28px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>🛡️ Connection Status</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: settings.snippet_verified_at ? '#25D366' : '#ef4444', boxShadow: settings.snippet_verified_at ? '0 0 10px #25D366' : '0 0 10px #ef4444' }} />
            <span style={{ fontSize: '14px', fontWeight: 700, color: settings.snippet_verified_at ? '#25D366' : '#ef4444' }}>
              {settings.snippet_verified_at ? 'CONNECTED & SYNCING' : 'NOT DETECTED'}
            </span>
          </div>
          <button 
            onClick={handleVerify}
            disabled={isVerifying}
            style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
          >
            {isVerifying ? '⌛ Checking Connection...' : 'VERIFY INSTALLATION'}
          </button>
          {settings.snippet_verified_at && (
            <p style={{ marginTop: '12px', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
              Last intelligence sync: {new Date(settings.snippet_verified_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
