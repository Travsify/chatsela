'use client';

import React, { useState, useEffect } from 'react';
import { getMerchantIntegrations, saveMerchantIntegrations } from '../bot/actions';
import { createClient } from '@/utils/supabase/client';

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

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [bookingUrl, setBookingUrl] = useState('');
  const [stripeSecret, setStripeSecret] = useState('');
  const [paystackSecret, setPaystackSecret] = useState('');
  const [hasStripe, setHasStripe] = useState(false);
  const [hasPaystack, setHasPaystack] = useState(false);
  
  // Currency States
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [targetCurrency, setTargetCurrency] = useState('NGN');
  const [exchangeRate, setExchangeRate] = useState(1600.0);
  const [manualRateActive, setManualRateActive] = useState(true);

  // Autonomous / God-Mode States
  const [isAutonomous, setIsAutonomous] = useState(false);
  const [autonomousInstruction, setAutonomousInstruction] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const ints = await getMerchantIntegrations();
      if (ints.success && ints.integrations) {
        setBookingUrl(ints.integrations.booking_url || '');
        setHasStripe(ints.integrations.has_stripe || false);
        setHasPaystack(ints.integrations.has_paystack || false);
        setBaseCurrency(ints.integrations.base_currency || 'USD');
        setTargetCurrency(ints.integrations.target_currency || 'NGN');
        setExchangeRate(ints.integrations.exchange_rate || 1600.0);
        setManualRateActive(ints.integrations.manual_rate_active ?? true);
        setIsAutonomous(ints.integrations.is_autonomous || false);
        setAutonomousInstruction(ints.integrations.autonomous_instruction || '');
        setWebsiteUrl(ints.integrations.website_url || '');
      }
    })();
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    const res = await saveMerchantIntegrations({ 
      booking_url: bookingUrl, 
      stripe_secret: stripeSecret || undefined, 
      paystack_secret: paystackSecret || undefined,
      base_currency: baseCurrency,
      target_currency: targetCurrency,
      exchange_rate: exchangeRate,
      manual_rate_active: manualRateActive,
      is_autonomous: isAutonomous,
      autonomous_instruction: autonomousInstruction,
      website_url: websiteUrl
    });

    if (res.success) {
      if (stripeSecret) setHasStripe(true);
      if (paystackSecret) setHasPaystack(true);
      setStripeSecret('');
      setPaystackSecret('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setIsSaving(false);
  };

  return (
    <main style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', gap: '30px', paddingBottom: '100px' }}>
      <header>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', background: 'linear-gradient(135deg,#fff,#888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          System Settings ⚙️
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>Manage your white-labeled business credentials, payments, and account security.</p>
      </header>

      {/* ── Currency & Exchange Rate ── */}
      <section style={commonSectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{ fontSize: '20px' }}>🌍</span>
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Universal Currency Hub</h3>
        </div>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>Define your base currency and set your own fixed exchange rates for global sales.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px' }}>Store Base Currency (e.g. USD)</label>
            <input 
              type="text" 
              value={baseCurrency} 
              onChange={(e) => setBaseCurrency(e.target.value)} 
              style={INPUT_STYLE} 
              placeholder="USD" 
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px' }}>Target/Local Currency (e.g. NGN)</label>
            <input 
              type="text" 
              value={targetCurrency} 
              onChange={(e) => setTargetCurrency(e.target.value)} 
              style={INPUT_STYLE} 
              placeholder="NGN" 
            />
          </div>
        </div>

        <div style={{ padding: '20px', background: 'rgba(0,255,136,0.05)', borderRadius: '16px', border: '1px solid rgba(0,255,136,0.1)' }}>
          <label style={{ fontSize: '12px', color: '#00ff88', fontWeight: 800, display: 'block', marginBottom: '12px', textTransform: 'uppercase' }}>Manual Exchange Rate Control</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>1 {baseCurrency || 'USD'} =</span>
            <input 
              type="number" 
              value={exchangeRate} 
              onChange={(e) => setExchangeRate(parseFloat(e.target.value))} 
              style={{ ...INPUT_STYLE, width: '120px', background: 'rgba(255,255,255,0.1)', color: '#00ff88', fontWeight: 800, fontSize: '16px' }} 
            />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{targetCurrency || 'NGN'}</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Fixed Rate Active</span>
              <div 
                onClick={() => setManualRateActive(!manualRateActive)}
                style={{ width: '40px', height: '20px', background: manualRateActive ? '#00ff88' : 'rgba(255,255,255,0.1)', borderRadius: '10px', cursor: 'pointer', position: 'relative' }}
              >
                <div style={{ width: '14px', height: '14px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '3px', left: manualRateActive ? '23px' : '3px', transition: 'all 0.2s' }} />
              </div>
            </div>
          </div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '12px' }}>This rate will be used by the AI to convert all product prices during WhatsApp sales conversations.</p>
        </div>
      </section>

      {/* ── God-Mode / Autonomous Engine ── */}
      <section style={{ ...commonSectionStyle, border: '1px solid rgba(0, 255, 136, 0.1)', background: 'linear-gradient(135deg, rgba(0,255,136,0.03) 0%, transparent 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🤖</span>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Autonomous God-Mode</h3>
              <p style={{ fontSize: '12px', color: 'rgba(0, 255, 136, 0.7)', fontWeight: 700 }}>AI INDEPENDENCE CONTROL</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Strict Autonomy {isAutonomous ? 'ON' : 'OFF'}</span>
            <div 
              onClick={() => setIsAutonomous(!isAutonomous)}
              style={{ width: '50px', height: '24px', background: isAutonomous ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', borderRadius: '12px', cursor: 'pointer', position: 'relative', transition: 'all 0.3s' }}
            >
              <div style={{ width: '18px', height: '18px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '3px', left: isAutonomous ? '28px' : '3px', transition: 'all 0.3s' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px' }}>Prime Website URL (Knowledge Source)</label>
            <input 
              type="text" 
              value={websiteUrl} 
              onChange={(e) => setWebsiteUrl(e.target.value)} 
              style={INPUT_STYLE} 
              placeholder="https://yourbusiness.com" 
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px' }}>Custom Autonomous Instructions (The "Closing" Logic)</label>
            <textarea 
              rows={4} 
              value={autonomousInstruction} 
              onChange={(e) => setAutonomousInstruction(e.target.value)} 
              style={{ ...INPUT_STYLE, resize: 'vertical' }} 
              placeholder="e.g. Always push for the premium plan. If the customer hesitates on price, offer a 10% discount immediately if they pay via Stripe today." 
            />
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>
              These high-level directives override the bot's base personality when it needs to close a deal or handle a complex inquiry.
            </p>
          </div>
        </div>
      </section>

      {/* 💳 Payments & Appointments */}
      <section className="glass" style={{ padding: '30px', borderRadius: '24px', borderLeft: '4px solid #00ff88' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <span style={{ fontSize: '20px' }}>💳</span>
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Integrations & Payments</h3>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>📅 Booking URL (Cal.com / Calendly)</label>
            <input type="text" value={bookingUrl} onChange={(e) => setBookingUrl(e.target.value)} placeholder="https://cal.com/your-business" style={INPUT_STYLE} />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                Stripe Secret Key {hasStripe && <span style={{ color: '#00ff88' }}>(Active ✅)</span>}
              </label>
              <input type="password" value={stripeSecret} onChange={(e) => setStripeSecret(e.target.value)} placeholder="sk_test_..." style={INPUT_STYLE} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                Paystack Secret Key {hasPaystack && <span style={{ color: '#00ff88' }}>(Active ✅)</span>}
              </label>
              <input type="password" value={paystackSecret} onChange={(e) => setPaystackSecret(e.target.value)} placeholder="sk_test_..." style={INPUT_STYLE} />
            </div>
          </div>

          <button onClick={handleSaveSettings} disabled={isSaving} className="glow-btn" style={{ width: 'fit-content', padding: '12px 32px' }}>
            {isSaving ? '⌛ Saving...' : saved ? '✅ Settings Updated' : '💾 Save Settings'}
          </button>
        </div>
      </section>

      {/* 👤 Account Details */}
      <section className="glass" style={{ padding: '30px', borderRadius: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>👤 Account Profile</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Email: <span style={{ color: '#fff', fontWeight: 600 }}>{user?.email}</span></p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Member Status: <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>VERIFIED</span></p>
        </div>
      </section>
    </main>
  );
}
