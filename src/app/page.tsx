import React from 'react';

export default function Home() {
  const currentYear = 2026;

  return (
    <div className="landing-container">
      {/* Navigation */}
      <nav className="glass" style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 40px)',
        maxWidth: 'var(--container-max)',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 30px',
        zIndex: 1000
      }}>
        <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'Outfit', background: 'var(--grad-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          ChatSela
        </div>
        <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
          <a href="#features" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>Features</a>
          <a href="#pricing" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>Pricing</a>
          <a href="#faq" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>FAQ</a>
          <a href="/signup" className="glow-btn" style={{ padding: '10px 24px', fontSize: '14px', textDecoration: 'none' }}>Get Started</a>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        paddingTop: '180px',
        paddingBottom: '100px',
        textAlign: 'center',
        background: 'radial-gradient(circle at center, rgba(0, 255, 136, 0.05) 0%, transparent 70%)'
      }}>
        <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>
          <div className="glass" style={{ 
            display: 'inline-block', 
            padding: '6px 16px', 
            marginBottom: '24px', 
            fontSize: '12px', 
            fontWeight: 600, 
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--accent-primary)'
          }}>
            🚀 Now powered by AI
          </div>
          <h1 style={{ fontSize: 'clamp(40px, 8vw, 72px)', lineHeight: '1.1', marginBottom: '30px' }}>
            Transform WhatsApp into your <span style={{ background: 'var(--grad-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>#1 Sales Channel</span>
          </h1>
          <p style={{ fontSize: '20px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '40px', maxWidth: '600px', marginInline: 'auto' }}>
            Sign up, connect your number, and let ChatSela handle your sales, inquiries, and customer support 24/7.
          </p>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/signup" className="glow-btn" style={{ padding: '12px 32px', fontSize: '15px', textDecoration: 'none' }}>Start Free Trial</a>
            <button className="glass glass-hover" style={{ padding: '14px 28px', fontWeight: 600 }}>Watch Demo</button>
          </div>
        </div>
      </section>

      {/* Progress Stats */}
      <section style={{ maxWidth: 'var(--container-max)', margin: '0 auto 100px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', padding: '0 20px' }}>
        {[
          { label: 'Messages Sent', val: '12.4M+' },
          { label: 'Sales Generated', val: '$850k+' },
          { label: 'Active Bots', val: '5,000+' },
          { label: 'Customer Rating', val: '4.9/5' }
        ].map((stat, i) => (
          <div key={i} className="glass" style={{ padding: '30px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', background: 'var(--grad-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{stat.val}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Features Preview */}
      <section id="features" style={{ padding: '100px 20px', maxWidth: 'var(--container-max)', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '42px', marginBottom: '60px' }}>Built for Business Growth</h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '30px' 
        }}>
          {[
            { title: 'Instant QR Setup', desc: 'Connect your existing WhatsApp number in seconds by scanning a QR code. No complex API approvals needed.', icon: '⚡' },
            { title: 'AI Sales Engine', desc: 'Our bots don\'t just reply; they sell. Automate product recommendations, checkout flows, and lead qualification.', icon: '🤖' },
            { title: 'Global Multi-Currency', desc: 'Accept payments in NGN via Paystack or USD via Stripe. Seamless scaling from local to global.', icon: '🌍' }
          ].map((feature, i) => (
            <div key={i} className="glass glass-hover" style={{ padding: '40px', textAlign: 'left' }}>
              <div style={{ fontSize: '40px', marginBottom: '20px' }}>{feature.icon}</div>
              <h3 style={{ fontSize: '24px', marginBottom: '16px' }}>{feature.title}</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{ padding: '100px 20px', maxWidth: 'var(--container-max)', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: '42px', marginBottom: '16px' }}>Simple, Scalable Pricing</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '60px' }}>Choose the plan that fits your business needs.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
          {[
            { name: 'Starter', price: '$29', currency: 'USD', features: ['1 Bot Instance', '1,000 Messages/mo', 'Stripe Integration', 'Basic Support'], recommended: false },
            { name: 'Professional', price: '$99', currency: 'USD', features: ['5 Bot Instances', '10,000 Messages/mo', 'Stripe & Paystack', 'Priority Support', 'AI Training'], recommended: true },
            { name: 'Business', price: '₦150,000', currency: 'NGN', features: ['Unlimited Bots', 'Unlimited Messages', 'Stripe & Paystack', '24/7 Account Manager', 'Custom Integration'], recommended: false }
          ].map((plan, i) => (
            <div key={i} className="glass glass-hover" style={{ padding: '40px', position: 'relative', border: plan.recommended ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)' }}>
              {plan.recommended && <div style={{ position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', background: 'var(--grad-primary)', color: '#000', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>MOST POPULAR</div>}
              <h3 style={{ fontSize: '24px', marginBottom: '10px' }}>{plan.name}</h3>
              <div style={{ fontSize: '42px', fontWeight: 800, marginBottom: '24px' }}>{plan.price}<span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>/mo</span></div>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '30px', textAlign: 'left' }}>
                {plan.features.map((f, ji) => (
                  <li key={ji} style={{ marginBottom: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: 'var(--accent-primary)' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button className={plan.recommended ? "glow-btn" : "glass"} style={{ width: '100%', padding: '12px', fontWeight: 600 }}>Get Started</button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" style={{ padding: '100px 20px', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '42px', marginBottom: '60px' }}>Frequently Asked Questions</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {[
            { q: 'Do I need a WhatsApp Business API account?', a: 'No, ChatSela works with your standard WhatsApp or WhatsApp Business account. Just scan the QR code and you\'re ready.' },
            { q: 'Can I accept payments in Naira and USD?', a: 'Yes! We integrate with Paystack for NGN payments and Stripe for global USD payments.' },
            { q: 'Is there a free trial?', a: 'We offer a 7-day free trial on all plans so you can experience the power of ChatSela before committing.' }
          ].map((item, i) => (
            <div key={i} className="glass" style={{ padding: '30px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>{item.q}</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Section */}
      <section style={{ textAlign: 'center', padding: '60px 0', borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '30px' }}>Trusted by forward-thinking teams</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '60px', opacity: 0.5, filter: 'grayscale(1)', flexWrap: 'wrap' }}>
          {['Zalora', 'Bolt', 'Paystack', 'Stripe', 'Flutterwave'].map(brand => (
            <span key={brand} style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'Outfit' }}>{brand}</span>
          ))}
        </div>
      </section>

      {/* Detailed Footer */}
      <footer style={{ padding: '100px 20px 40px', background: 'linear-gradient(180deg, transparent, rgba(0, 255, 136, 0.02))' }}>
        <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '60px', marginBottom: '80px', textAlign: 'left' }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 800, marginBottom: '20px', fontFamily: 'Outfit', background: 'var(--grad-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ChatSela</div>
              <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '14px' }}>The world's most advanced WhatsApp sales platform. Empowering businesses to grow without limits.</p>
            </div>
            <div>
              <h4 style={{ marginBottom: '24px', fontSize: '16px' }}>Product</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: 'var(--text-muted)' }}>
                <a href="#features" className="glass-hover" style={{ width: 'fit-content' }}>Features</a>
                <a href="#pricing" className="glass-hover" style={{ width: 'fit-content' }}>Pricing</a>
                <a href="#faq" className="glass-hover" style={{ width: 'fit-content' }}>FAQ</a>
              </div>
            </div>
            <div>
              <h4 style={{ marginBottom: '24px', fontSize: '16px' }}>Company</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: 'var(--text-muted)' }}>
                <a href="#" className="glass-hover" style={{ width: 'fit-content' }}>About Us</a>
                <a href="#" className="glass-hover" style={{ width: 'fit-content' }}>Terms of Service</a>
                <a href="#" className="glass-hover" style={{ width: 'fit-content' }}>Privacy Policy</a>
              </div>
            </div>
            <div>
              <h4 style={{ marginBottom: '24px', fontSize: '16px' }}>Connect</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: 'var(--text-muted)' }}>
                <a href="#" className="glass-hover" style={{ width: 'fit-content' }}>Twitter / X</a>
                <a href="#" className="glass-hover" style={{ width: 'fit-content' }}>LinkedIn</a>
                <a href="#" className="glass-hover" style={{ width: 'fit-content' }}>WhatsApp Support</a>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>&copy; {currentYear} ChatSela AI. Built for the next billion dollar businesses.</p>
            <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: 'var(--text-muted)' }}>
              <span>Global 🌍</span>
              <span>Lagos, NG 🇳🇬</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
