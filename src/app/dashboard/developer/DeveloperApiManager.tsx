'use client';

import React, { useState } from 'react';
import { generateApiKey, revokeApiKey } from './actions';

interface Props {
  initialApiKey: string | null;
  initialCreatedAt: string | null;
  businessName: string;
  totalMessages: number;
}

const CODE_EXAMPLES = {
  curl: (key: string, endpoint: string, method: string, body?: string) =>
    `curl -X ${method} https://api.chatsela.com/v1/${endpoint} \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json"${body ? ` \\
  -d '${body}'` : ''}`,
  js: (key: string, endpoint: string, method: string, body?: string) =>
    `const res = await fetch('https://api.chatsela.com/v1/${endpoint}', {
  method: '${method}',
  headers: {
    'Authorization': 'Bearer ${key}',
    'Content-Type': 'application/json',
  },${body ? `
  body: JSON.stringify(${body}),` : ''}
});
const data = await res.json();`,
  python: (key: string, endpoint: string, method: string, body?: string) =>
    `import requests

res = requests.${method.toLowerCase()}(
  "https://api.chatsela.com/v1/${endpoint}",
  headers={"Authorization": f"Bearer ${key}"},${body ? `
  json=${body},` : ''}
)
print(res.json())`,
};

const ENDPOINTS = [
  {
    id: 'send',
    method: 'POST',
    path: 'messages/send',
    label: 'Send WhatsApp Message',
    desc: 'Send a text message to any WhatsApp number via your linked ChatSela instance.',
    color: '#00ccff',
    body: '{"to":"2348030000000","text":"Hello from ChatSela!"}',
  },
  {
    id: 'products',
    method: 'GET',
    path: 'products',
    label: 'List Products',
    desc: 'Retrieve the active product catalog visible to your AI Sales Assistant.',
    color: '#00ff88',
    body: undefined,
  },
  {
    id: 'leads',
    method: 'GET',
    path: 'leads',
    label: 'Get Active Leads',
    desc: 'Fetch all active conversation threads and leads from your WhatsApp inbox.',
    color: '#00ff88',
    body: undefined,
  },
  {
    id: 'bot',
    method: 'PATCH',
    path: 'bot/status',
    label: 'Toggle Bot Status',
    desc: 'Enable or pause your AI bot for a specific customer contact.',
    color: '#ffaa00',
    body: '{"contact":"2348030000000","bot_enabled":false}',
  },
];

export default function DeveloperApiManager({ initialApiKey, initialCreatedAt, businessName, totalMessages }: Props) {
  const [apiKey, setApiKey] = useState<string | null>(initialApiKey);
  const [createdAt, setCreatedAt] = useState<string | null>(initialCreatedAt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<'curl' | 'js' | 'python'>('curl');
  const [selectedEndpoint, setSelectedEndpoint] = useState(ENDPOINTS[0]);

  const displayKey = apiKey || 'csela_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    const result = await generateApiKey();
    if (result.error) {
      setError(result.error);
    } else if (result.apiKey) {
      setApiKey(result.apiKey);
      setCreatedAt(result.createdAt || new Date().toISOString());
      setIsVisible(true);
    }
    setIsGenerating(false);
  };

  const handleRevoke = async () => {
    if (!window.confirm('Are you sure you want to revoke this API key? Any applications using it will stop working immediately.')) return;
    setIsGenerating(true);
    setError(null);
    const result = await revokeApiKey();
    if (result.error) {
      setError(result.error);
    } else {
      setApiKey(null);
      setCreatedAt(null);
      setIsVisible(false);
    }
    setIsGenerating(false);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const codeSnippet = CODE_EXAMPLES[selectedLang](
    apiKey || 'csela_your_api_key_here',
    selectedEndpoint.path,
    selectedEndpoint.method,
    selectedEndpoint.body,
  );

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[
          { label: 'API Status', val: apiKey ? '🟢 Active' : '🔴 Inactive', sub: apiKey ? 'Key is live' : 'No key generated' },
          { label: 'Messages Processed', val: totalMessages.toLocaleString(), sub: 'All time via bot' },
          { label: 'Rate Limit', val: '1,000 / day', sub: 'Current plan' },
        ].map((stat, i) => (
          <div key={i} className="glass" style={{ padding: '20px', borderRadius: '16px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>{stat.label}</p>
            <p style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>{stat.val}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* API Key Card */}
      <section className="glass" style={{ padding: '32px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>🔑 Secret API Key</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              This key grants full access to your ChatSela instance. Keep it private — never expose it on the client side.
            </p>
          </div>
          <a href="/docs" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-secondary)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            API Docs ↗
          </a>
        </div>

        {error && (
          <div style={{ background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', borderRadius: '12px', padding: '12px 16px', color: '#ff6b6b', fontSize: '13px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Key Display */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: '#000',
          padding: '14px 18px',
          borderRadius: '14px',
          border: '1px solid var(--glass-border)',
          gap: '12px',
          opacity: apiKey ? 1 : 0.5,
        }}>
          <span style={{ fontFamily: 'monospace', flex: 1, fontSize: '13px', letterSpacing: '0.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isVisible ? displayKey : (apiKey ? 'csela_' + '•'.repeat(48) : '— No key generated —')}
          </span>

          {apiKey && (
            <>
              <button
                onClick={() => setIsVisible(!isVisible)}
                title={isVisible ? 'Hide key' : 'Show key'}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px', flexShrink: 0, padding: '0 4px' }}
              >
                {isVisible ? '🙈' : '👁️'}
              </button>

              <button
                onClick={() => handleCopy(displayKey, 'key')}
                style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.2)', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '12px', padding: '6px 14px', borderRadius: '8px', flexShrink: 0, transition: 'all 0.2s' }}
              >
                {copied === 'key' ? '✓ Copied!' : 'Copy'}
              </button>
            </>
          )}
        </div>

        {createdAt && (
          <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            🕐 Generated on {formatDate(createdAt)}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {!apiKey ? (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="glow-btn"
              style={{ padding: '12px 28px', opacity: isGenerating ? 0.7 : 1 }}
            >
              {isGenerating ? '⏳ Generating...' : '✨ Generate API Key'}
            </button>
          ) : (
            <>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 22px', borderRadius: '10px', fontSize: '13px', cursor: isGenerating ? 'not-allowed' : 'pointer', transition: 'all 0.2s', fontWeight: 600 }}
              >
                {isGenerating ? '⏳ Rotating...' : '🔄 Rotate Key'}
              </button>
              <button
                onClick={handleRevoke}
                disabled={isGenerating}
                style={{ background: 'rgba(255,50,50,0.08)', color: '#ff6b6b', border: '1px solid rgba(255,50,50,0.2)', padding: '10px 22px', borderRadius: '10px', fontSize: '13px', cursor: isGenerating ? 'not-allowed' : 'pointer', transition: 'all 0.2s', fontWeight: 600 }}
              >
                🗑️ Revoke
              </button>
            </>
          )}
        </div>
      </section>

      {/* Interactive Code Playground */}
      <section className="glass" style={{ padding: '32px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700 }}>⚡ Quick Start Playground</h3>

        {/* Endpoint picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Select Endpoint</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {ENDPOINTS.map((ep) => (
              <button
                key={ep.id}
                onClick={() => setSelectedEndpoint(ep)}
                style={{
                  background: selectedEndpoint.id === ep.id ? 'rgba(0,255,136,0.07)' : 'rgba(255,255,255,0.02)',
                  border: selectedEndpoint.id === ep.id ? '1px solid rgba(0,255,136,0.25)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ background: ep.method === 'GET' ? 'rgba(0,255,136,0.12)' : ep.method === 'POST' ? 'rgba(0,200,255,0.12)' : 'rgba(255,170,0,0.12)', color: ep.color, padding: '2px 6px', borderRadius: '5px', fontSize: '10px', fontWeight: 800, fontFamily: 'monospace', flexShrink: 0 }}>{ep.method}</span>
                <span>{ep.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Language picker */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['curl', 'js', 'python'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setSelectedLang(lang)}
              style={{
                background: selectedLang === lang ? 'var(--glass-bg)' : 'transparent',
                border: selectedLang === lang ? '1px solid var(--glass-border)' : '1px solid transparent',
                borderRadius: '8px',
                padding: '6px 16px',
                color: selectedLang === lang ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: selectedLang === lang ? 600 : 400,
                transition: 'all 0.2s',
              }}
            >
              {lang === 'curl' ? 'cURL' : lang === 'js' ? 'JavaScript' : 'Python'}
            </button>
          ))}
        </div>

        {/* Code block */}
        <div style={{ position: 'relative' }}>
          <pre style={{
            background: '#000',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            padding: '20px',
            fontSize: '13px',
            color: '#e2e8f0',
            fontFamily: 'monospace',
            overflowX: 'auto',
            lineHeight: '1.7',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}>
            {codeSnippet}
          </pre>
          <button
            onClick={() => handleCopy(codeSnippet, 'code')}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '6px 14px',
              color: copied === 'code' ? 'var(--accent-primary)' : 'var(--text-muted)',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: 600,
            }}
          >
            {copied === 'code' ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          {selectedEndpoint.desc}
        </p>
      </section>

      {/* Docs Link */}
      <section className="glass" style={{ padding: '24px 32px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>📄 Full API Documentation</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Explore all endpoints, webhooks, and rate limits in the complete reference.</p>
        </div>
        <a
          href="/docs"
          target="_blank"
          rel="noreferrer"
          className="glow-btn"
          style={{ padding: '10px 24px', fontSize: '13px', whiteSpace: 'nowrap' }}
        >
          View Docs ↗
        </a>
      </section>
    </div>
  );
}
