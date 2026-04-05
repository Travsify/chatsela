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

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [bookingUrl, setBookingUrl] = useState('');
  const [stripeSecret, setStripeSecret] = useState('');
  const [paystackSecret, setPaystackSecret] = useState('');
  const [hasStripe, setHasStripe] = useState(false);
  const [hasPaystack, setHasPaystack] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const ints = await getMerchantIntegrations();
      if (ints.success) {
        setBookingUrl(ints.integrations.booking_url);
        setHasStripe(ints.integrations.has_stripe);
        setHasPaystack(ints.integrations.has_paystack);
      }
    })();
  }, []);

  const handleSaveIntegrations = async () => {
    setIsSaving(true);
    const res = await saveMerchantIntegrations({ 
      booking_url: bookingUrl, 
      stripe_secret: stripeSecret || undefined, 
      paystack_secret: paystackSecret || undefined 
    });
    if (res.success) {
      setStripeSecret('');
      setPaystackSecret('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      
      const ints = await getMerchantIntegrations();
      if (ints.success) {
        setHasStripe(ints.integrations.has_stripe);
        setHasPaystack(ints.integrations.has_paystack);
      }
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

          <button onClick={handleSaveIntegrations} disabled={isSaving} className="glow-btn" style={{ width: 'fit-content', padding: '12px 32px' }}>
            {isSaving ? '⌛ Saving...' : saved ? '✅ Settings Updated' : '💾 Save Integrations'}
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
