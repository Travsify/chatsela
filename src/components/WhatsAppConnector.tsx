'use client';

import React, { useState, useEffect } from 'react';
import { getWhatsAppQR, getWhatsAppStatus, getWhatsAppPairingCode } from '@/app/dashboard/actions';

export default function WhatsAppConnector() {
  const [qr, setQr] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [method, setMethod] = useState<'qr' | 'pairing'>('qr');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<'idle' | 'linking' | 'connected' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    const check = await getWhatsAppStatus();
    if (check.authenticated) {
      setStatus('connected');
    } else {
      setStatus('idle');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    setStatus('linking');
    setError(null);
    
    const result = await getWhatsAppQR();
    if (result.authenticated) {
      setStatus('connected');
    } else if (result.qr) {
      setQr(result.qr);
    } else {
      setError(result.error || 'Failed to get QR');
      setStatus('error');
    }
    setLoading(false);
  };

  const handlePairingConnect = async () => {
    if (!phoneNumber) {
      setError('Please enter your phone number');
      return;
    }
    setLoading(true);
    setStatus('linking');
    setError(null);
    
    const result = await getWhatsAppPairingCode(phoneNumber);
    if (result.authenticated) {
      setStatus('connected');
    } else if (result.code) {
      setPairingCode(result.code);
    } else {
      setError(result.error || 'Failed to generate code');
      setStatus('error');
    }
    setLoading(false);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (qr && status === 'linking') {
      interval = setInterval(async () => {
        const check = await getWhatsAppStatus();
        if (check.authenticated) {
          setStatus('connected');
          setQr(null);
          clearInterval(interval);
        }
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [qr, status]);

  return (
    <div className="glass" style={{ padding: '30px', borderRadius: '24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: status === 'connected' ? 'var(--accent-primary)' : 'var(--grad-primary)' }}></div>
      
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
        {status === 'connected' ? '✅ WhatsApp Connected!' : '📱 Link Your WhatsApp'}
      </h2>
      
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>
        {status === 'connected' 
          ? 'Your AI sales agent is now live and ready to handle messages.' 
          : 'Connect your WhatsApp via QR code to enable AI-automated sales and enquiries.'}
      </p>

      {status === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          {method === 'qr' ? (
            <button onClick={handleConnect} disabled={loading} className="glow-btn" style={{ padding: '14px 32px' }}>
              {loading ? 'Initializing...' : 'Link New Number (QR)'}
            </button>
          ) : (
            <div style={{ width: '100%', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input 
                type="tel" 
                placeholder="Phone (e.g. 2348030000000)" 
                value={phoneNumber} 
                onChange={(e) => setPhoneNumber(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '12px', color: '#fff', textAlign: 'center' }}
              />
              <button onClick={handlePairingConnect} disabled={loading} className="glow-btn" style={{ width: '100%', padding: '14px' }}>
                {loading ? 'Generating Code...' : 'Get Pairing Code'}
              </button>
            </div>
          )}
          
          <button 
            onClick={() => setMethod(method === 'qr' ? 'pairing' : 'qr')} 
            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {method === 'qr' ? 'Use phone number instead' : 'Use QR code instead'}
          </button>
        </div>
      )}

      {status === 'linking' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          {method === 'qr' ? (
            qr ? (
              <div style={{ background: '#fff', padding: '15px', borderRadius: '16px', display: 'inline-block', boxShadow: '0 0 40px rgba(0,255,136,0.2)' }}>
                <img src={qr} alt="Scan QR Code" style={{ width: '200px', height: '200px', display: 'block' }} />
              </div>
            ) : (
              <div className="shimmer" style={{ width: '200px', height: '200px', borderRadius: '16px' }}></div>
            )
          ) : (
            pairingCode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ background: 'rgba(0,255,136,0.1)', padding: '20px 40px', borderRadius: '16px', border: '2px dashed var(--accent-primary)', fontSize: '32px', fontWeight: 800, letterSpacing: '4px', color: 'var(--accent-primary)' }}>
                  {pairingCode}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Enter this code in WhatsApp on your phone</p>
              </div>
            ) : (
              <div className="shimmer" style={{ width: '250px', height: '80px', borderRadius: '16px' }}></div>
            )
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
            <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }}></div>
            <span>Waiting for connection...</span>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={fetchStatus} 
              disabled={loading}
              style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}
            >
              {loading ? 'Checking...' : '🔄 Refresh Status'}
            </button>
            <button 
              onClick={() => { setStatus('idle'); setQr(null); setPairingCode(null); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {status === 'connected' && (
        <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.1)' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>⚡</div>
          <button className="glass-hover" style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', fontSize: '12px' }}>Manage Sessions</button>
        </div>
      )}

      {status === 'error' && (
        <div>
          <p style={{ color: '#ff4d4d', fontSize: '14px', marginBottom: '16px' }}>❌ {error}</p>
          <button onClick={handleConnect} className="glass-hover" style={{ padding: '10px 24px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'transparent', color: '#fff' }}>Try Again</button>
        </div>
      )}

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { animation: spin 0.8s linear infinite; }
        .shimmer { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>
    </div>
  );
}
