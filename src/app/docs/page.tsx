import React from 'react';

export const metadata = {
  title: 'ChatSela API Reference – Developer Documentation',
  description: 'Complete API reference for ChatSela. Send WhatsApp messages, manage AI bots, and sync leads programmatically.',
};

const ENDPOINTS = [
  {
    id: 'send-message',
    method: 'POST',
    path: '/v1/messages/send',
    label: 'Send a WhatsApp Message',
    desc: 'Send a WhatsApp message to any phone number using your connected ChatSela instance.',
    color: '#00ccff',
    badge_bg: 'rgba(0, 200, 255, 0.12)',
    requestBody: `{
  "to": "2348030000000",
  "text": "Hello from ChatSela! 👋 Your order is confirmed."
}`,
    responseBody: `{
  "success": true,
  "message_id": "msg_9f3b890c4da1",
  "to": "2348030000000",
  "timestamp": "2025-04-04T10:00:00Z"
}`,
    params: [
      { name: 'to', type: 'string', req: true, desc: 'Phone number with country code, no +' },
      { name: 'text', type: 'string', req: true, desc: 'Message body to send' },
    ],
  },
  {
    id: 'list-products',
    method: 'GET',
    path: '/v1/products',
    label: 'List Products',
    desc: 'Retrieve the complete product catalog linked to your AI Sales Assistant.',
    color: '#00ff88',
    badge_bg: 'rgba(0, 255, 136, 0.1)',
    requestBody: null,
    responseBody: `{
  "data": [
    {
      "id": "prod_abc123",
      "name": "Premium Plan",
      "description": "Full access to all features.",
      "price": 99.00,
      "currency": "USD",
      "is_active": true
    }
  ],
  "count": 1
}`,
    params: [
      { name: 'is_active', type: 'boolean', req: false, desc: 'Filter by active status (default: true)' },
      { name: 'limit', type: 'integer', req: false, desc: 'Max records to return (default: 50)' },
    ],
  },
  {
    id: 'get-leads',
    method: 'GET',
    path: '/v1/leads',
    label: 'Get Active Leads',
    desc: 'Fetch all active WhatsApp conversation threads and their current bot status.',
    color: '#00ff88',
    badge_bg: 'rgba(0, 255, 136, 0.1)',
    requestBody: null,
    responseBody: `{
  "data": [
    {
      "contact": "2348030000000",
      "last_message": "I am interested in the Premium Plan",
      "bot_enabled": true,
      "last_seen": "2025-04-04T09:55:00Z"
    }
  ],
  "count": 12
}`,
    params: [
      { name: 'bot_enabled', type: 'boolean', req: false, desc: 'Filter by bot status' },
    ],
  },
  {
    id: 'toggle-bot',
    method: 'PATCH',
    path: '/v1/bot/status',
    label: 'Toggle Bot for Contact',
    desc: 'Enable or pause the AI bot for a specific customer contact. Used for human handoff.',
    color: '#ffaa00',
    badge_bg: 'rgba(255, 170, 0, 0.12)',
    requestBody: `{
  "contact": "2348030000000",
  "bot_enabled": false
}`,
    responseBody: `{
  "success": true,
  "contact": "2348030000000",
  "bot_enabled": false
}`,
    params: [
      { name: 'contact', type: 'string', req: true, desc: 'Phone number of the customer contact' },
      { name: 'bot_enabled', type: 'boolean', req: true, desc: 'true to activate bot, false to pause' },
    ],
  },
  {
    id: 'webhook',
    method: 'POST',
    path: '/api/webhook/whatsapp',
    label: 'Webhook (Incoming Messages)',
    desc: 'This is the endpoint you configure in Whapi.Cloud. ChatSela receives all inbound WhatsApp messages here and routes them to the correct user\'s AI bot.',
    color: '#cc88ff',
    badge_bg: 'rgba(200, 136, 255, 0.12)',
    requestBody: `{
  "event": {
    "type": "messages"
  },
  "messages": [
    {
      "id": "msg_xyz",
      "from": "2348030000000",
      "body": "Hi, what are your prices?",
      "from_me": false,
      "timestamp": 1743760000,
      "chat_id": "2348030000000@s.whatsapp.net"
    }
  ],
  "channel_id": "ch_abc123"
}`,
    responseBody: `{ "status": "ok" }`,
    params: [],
  },
];

export default function ApiDocsPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#050505', color: '#fff', fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <header style={{ padding: '18px 48px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, background: 'rgba(5,5,5,0.85)', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <a href="/dashboard" style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'Outfit, sans-serif', background: 'linear-gradient(135deg, #00ff88, #00d4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ChatSela
          </a>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '20px' }}>/</span>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontWeight: 500 }}>API Reference</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ background: 'rgba(0,255,136,0.1)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.2)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>v1.0</span>
          <a href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Dashboard</a>
          <a href="/dashboard/developer" style={{ color: '#00ff88', textDecoration: 'none', fontSize: '14px', fontWeight: 600, background: 'rgba(0,255,136,0.08)', padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(0,255,136,0.15)' }}>Get API Key</a>
        </div>
      </header>

      {/* Body */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '60px 24px', display: 'flex', gap: '60px', alignItems: 'flex-start' }}>

        {/* Left Sidebar */}
        <aside style={{ width: '220px', flexShrink: 0, position: 'sticky', top: '90px' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: '12px', fontWeight: 600 }}>Getting Started</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <a href="#intro" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', padding: '4px 0' }}>Introduction</a>
                <a href="#auth" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', padding: '4px 0' }}>Authentication</a>
                <a href="#errors" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', padding: '4px 0' }}>Error Codes</a>
                <a href="#rate-limits" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', padding: '4px 0' }}>Rate Limits</a>
              </div>
            </div>
            <div>
              <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: '12px', fontWeight: 600 }}>Endpoints</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {ENDPOINTS.map((ep) => (
                  <a key={ep.id} href={`#${ep.id}`} style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', padding: '4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: ep.badge_bg, color: ep.color, padding: '1px 5px', borderRadius: '4px', fontSize: '9px', fontWeight: 800, fontFamily: 'monospace', flexShrink: 0 }}>{ep.method}</span>
                    {ep.label}
                  </a>
                ))}
              </div>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '80px' }}>

          {/* Intro */}
          <section id="intro">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: '20px', padding: '6px 14px', marginBottom: '24px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00ff88', flexShrink: 0, animation: 'pulse 2s infinite' }}></span>
              <span style={{ color: '#00ff88', fontSize: '12px', fontWeight: 600 }}>API v1.0 — Stable</span>
            </div>
            <h1 style={{ fontSize: '42px', fontWeight: 800, fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em', marginBottom: '20px', lineHeight: 1.2 }}>ChatSela API Reference</h1>
            <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.7', maxWidth: '580px' }}>
              The ChatSela REST API lets you trigger WhatsApp messages, manage your AI sales bot, and sync lead data into any CRM or custom application.
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '28px', flexWrap: 'wrap' }}>
              <a href="/dashboard/developer" style={{ background: 'linear-gradient(135deg,#00ff88,#00d4ff)', color: '#000', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>Get API Key →</a>
              <a href="#send-message" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>Quick Example</a>
            </div>
          </section>

          {/* Base URL */}
          <section id="auth">
            <h2 style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'Outfit, sans-serif', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '14px', marginBottom: '24px' }}>Authentication</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: '1.7', marginBottom: '20px', fontSize: '15px' }}>
              All requests must include your API key as a <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '5px', fontSize: '13px' }}>Bearer</code> token in the <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '5px', fontSize: '13px' }}>Authorization</code> header.
              Generate your key from the <a href="/dashboard/developer" style={{ color: '#00ff88', textDecoration: 'none', fontWeight: 600 }}>Developer Dashboard</a>.
            </p>

            <div style={{ background: '#000', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Base URL</p>
              <code style={{ color: '#00ff88', fontFamily: 'monospace', fontSize: '15px' }}>https://api.chatsela.com</code>
            </div>

            <div style={{ background: '#000', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Example Header</p>
              <pre style={{ fontFamily: 'monospace', fontSize: '14px', color: '#e2e8f0', lineHeight: '1.6', margin: 0 }}>{`Authorization: Bearer csela_7f3b890c4da1e2...`}</pre>
            </div>
          </section>

          {/* Errors */}
          <section id="errors">
            <h2 style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'Outfit, sans-serif', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '14px', marginBottom: '24px' }}>Error Codes</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { code: '401', label: 'Unauthorized', color: '#ff6b6b', desc: 'Missing or invalid API key.' },
                { code: '403', label: 'Forbidden', color: '#ffaa00', desc: 'You are not allowed to access this resource.' },
                { code: '404', label: 'Not Found', color: 'rgba(255,255,255,0.5)', desc: 'The requested resource does not exist.' },
                { code: '422', label: 'Unprocessable', color: '#ffaa00', desc: 'Request body is missing required fields.' },
                { code: '429', label: 'Rate Limited', color: '#ff6b6b', desc: 'Too many requests. Slow down.' },
                { code: '500', label: 'Server Error', color: '#ff6b6b', desc: 'An internal error occurred. Contact support.' },
              ].map((e) => (
                <div key={e.code} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 800, color: e.color, minWidth: '40px' }}>{e.code}</span>
                  <span style={{ fontWeight: 600, fontSize: '14px', minWidth: '120px' }}>{e.label}</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>{e.desc}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Rate Limits */}
          <section id="rate-limits">
            <h2 style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'Outfit, sans-serif', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '14px', marginBottom: '24px' }}>Rate Limits</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {[
                { plan: 'Starter', limit: '1,000 / day', icon: '🌱' },
                { plan: 'Professional', limit: '10,000 / day', icon: '⚡' },
                { plan: 'Business', limit: 'Unlimited', icon: '🏢' },
              ].map((row) => (
                <div key={row.plan} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>{row.icon}</div>
                  <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{row.plan}</p>
                  <p style={{ color: '#00ff88', fontFamily: 'monospace', fontSize: '14px', fontWeight: 600 }}>{row.limit}</p>
                </div>
              ))}
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginTop: '16px' }}>
              Rate limit headers are returned in every response: <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '5px' }}>X-RateLimit-Remaining</code>, <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '5px' }}>X-RateLimit-Reset</code>
            </p>
          </section>

          {/* Endpoint blocks */}
          {ENDPOINTS.map((ep) => (
            <section key={ep.id} id={ep.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                <span style={{ background: ep.badge_bg, color: ep.color, padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, fontFamily: 'monospace' }}>{ep.method}</span>
                <code style={{ fontSize: '16px', color: '#fff' }}>{ep.path}</code>
              </div>

              <h2 style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'Outfit, sans-serif', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '14px', marginBottom: '20px' }}>{ep.label}</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: '1.7', marginBottom: '24px', fontSize: '15px' }}>{ep.desc}</p>

              {/* Parameters */}
              {ep.params.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: '12px', fontWeight: 600 }}>{ep.method === 'GET' ? 'Query Parameters' : 'Request Body'}</h4>
                  <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
                    {ep.params.map((p, i) => (
                      <div key={p.name} style={{ padding: '14px 20px', borderBottom: i < ep.params.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <code style={{ color: '#00ccff', fontSize: '13px', fontFamily: 'monospace', minWidth: '140px', flexShrink: 0 }}>{p.name}</code>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontFamily: 'monospace', minWidth: '60px', flexShrink: 0 }}>{p.type}</span>
                        {p.req && <span style={{ background: 'rgba(255,100,100,0.1)', color: '#ff8888', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>required</span>}
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', lineHeight: '1.5' }}>{p.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Code Blocks */}
              <div style={{ display: 'grid', gridTemplateColumns: ep.requestBody ? '1fr 1fr' : '1fr', gap: '16px' }}>
                {ep.requestBody && (
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Request</p>
                    <pre style={{ background: '#000', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '18px', fontFamily: 'monospace', fontSize: '13px', color: '#e2e8f0', margin: 0, lineHeight: '1.6', overflowX: 'auto' }}>{ep.requestBody}</pre>
                  </div>
                )}
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Response</p>
                  <pre style={{ background: '#000', border: '1px solid rgba(0,255,136,0.12)', borderRadius: '12px', padding: '18px', fontFamily: 'monospace', fontSize: '13px', color: '#00ff88', margin: 0, lineHeight: '1.6', overflowX: 'auto' }}>{ep.responseBody}</pre>
                </div>
              </div>
            </section>
          ))}

          {/* Footer */}
          <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'Outfit,sans-serif', background: 'linear-gradient(135deg,#00ff88,#00d4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ChatSela</div>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>© {new Date().getFullYear()} ChatSela. All rights reserved.</p>
            <div style={{ display: 'flex', gap: '20px' }}>
              <a href="/dashboard" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textDecoration: 'none' }}>Dashboard</a>
              <a href="/dashboard/developer" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textDecoration: 'none' }}>API Keys</a>
            </div>
          </footer>

        </main>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;600;800&display=swap');
        * { box-sizing: border-box; padding: 0; margin: 0; }
        body { background: #050505; font-family: 'Inter', sans-serif; }
        a:hover { opacity: 0.8; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
