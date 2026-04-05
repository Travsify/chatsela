'use client';

import React, { useState } from 'react';
import { createStripeSession } from '@/app/payments/stripe/actions';
import { createPaystackSession } from '@/app/payments/paystack/actions';

export default function PricingPage() {
  const [currency, setCurrency] = useState<'USD' | 'NGN'>('USD');

  const handlePayment = async (plan: any) => {
    if (currency === 'USD') {
      // Mock Price IDs - replace with real ones from Stripe Dashboard
      const priceMap: any = { 'Starter': 'price_1Starter', 'Professional': 'price_1Prof', 'Business': 'price_1Bus' };
      await createStripeSession(priceMap[plan.name]);
    } else {
      const amountMap: any = { 'Starter': 15000, 'Professional': 50000, 'Business': 150000 };
      await createPaystackSession(amountMap[plan.name], 'customer@example.com', plan.name.toLowerCase());
    }
  };

  const plans = [
    { 
      name: 'Starter', 
      usd: '$29', 
      ngn: '₦15,000',
      features: ['1 WhatsApp Account', '1,000 Messages/mo', 'Basic AI Responses', 'Stripe Payments', 'Email Support'] 
    },
    { 
      name: 'Professional', 
      usd: '$99', 
      ngn: '₦50,000',
      isPopular: true, 
      features: ['5 WhatsApp Accounts', '10,000 Messages/mo', 'Advanced AI Training', 'Stripe & Paystack', 'Priority Support'] 
    },
    { 
      name: 'Business', 
      usd: '$299', 
      ngn: '₦150,000',
      features: ['Unlimited Accounts', 'Unlimited Messages', 'Custom API Access', 'Dedicated Manager', 'White-label Option'] 
    }
  ];

  return (
    <>
      <main style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        <h1 style={{ fontSize: '36px', marginBottom: '8px' }}>Choose your path to growth</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '30px' }}>Upgrade your plan to unlock more WhatsApp instances and bot capabilities.</p>
        
        {/* Currency Toggle */}
        <div style={{ display: 'inline-flex', background: 'var(--glass-bg)', padding: '6px', borderRadius: '40px', marginBottom: '60px', border: '1px solid var(--glass-border)' }}>
          <button 
            onClick={() => setCurrency('USD')}
            style={{ padding: '10px 24px', borderRadius: '30px', border: 'none', background: currency === 'USD' ? 'var(--grad-primary)' : 'transparent', color: currency === 'USD' ? '#000' : 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', transition: '0.3s' }}
          >USD ($)</button>
          <button 
            onClick={() => setCurrency('NGN')}
            style={{ padding: '10px 24px', borderRadius: '30px', border: 'none', background: currency === 'NGN' ? 'var(--grad-primary)' : 'transparent', color: currency === 'NGN' ? '#000' : 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', transition: '0.3s' }}
          >NGN (₦)</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '40px' }}>
          {plans.map((plan, i) => (
            <div key={i} className="glass glass-hover" style={{ 
              padding: '60px 40px', textAlign: 'left',
              border: plan.isPopular ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
              position: 'relative'
            }}>
              {plan.isPopular && (
                <div style={{ position: 'absolute', top: '24px', right: '40px', background: 'var(--accent-primary)', color: '#000', fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '20px' }}>RECOMMENDED</div>
              )}
              <h2 style={{ fontSize: '28px', marginBottom: '16px' }}>{plan.name}</h2>
              <div style={{ fontSize: '48px', fontWeight: 800, marginBottom: '32px' }}>
                {currency === 'USD' ? plan.usd : plan.ngn}<span style={{ fontSize: '18px', color: 'var(--text-muted)', fontWeight: 400 }}>/month</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '40px', borderTop: '1px solid var(--glass-border)', paddingTop: '32px' }}>
                {plan.features.map((f, ji) => (
                  <li key={ji} style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--text-muted)', fontSize: '15px' }}>
                    <span style={{ color: 'var(--accent-primary)' }}>✦</span> {f}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => handlePayment(plan)}
                className={plan.isPopular ? "glow-btn" : "glass"} 
                style={{ width: '100%', padding: '16px', fontWeight: 700, fontSize: '16px', border: plan.isPopular ? 'none' : '1px solid var(--glass-border)' }}
              >
                Get {plan.name}
              </button>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
