'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  getBotSettings, 
  saveBotSettings, 
  getKnowledgeBaseDocs,
  addKnowledgeFact,
  deleteKnowledgeFact,
  processDocumentUpload,
  getTrainingQuestions,
  submitTrainingAnswer,
  scrapeWebsiteToKnowledgeBase,
  getMerchantIntegrations,
  saveMerchantIntegrations,
  generateBotConfig
} from './actions';

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      role="switch"
      style={{
        width: '46px', height: '24px', flexShrink: 0,
        background: on ? 'linear-gradient(135deg,#00ff88,#00d4ff)' : 'rgba(255,255,255,0.1)',
        borderRadius: '12px', padding: '3px', cursor: 'pointer', transition: 'background 0.25s',
        display: 'flex', alignItems: 'center',
      }}
    >
      <div style={{
        width: '18px', height: '18px', background: '#fff', borderRadius: '50%',
        marginLeft: on ? '22px' : '0px', transition: 'margin 0.2s ease',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
}

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

export default function BotConfigPage() {
  const [botName, setBotName]             = useState('My Sales Assistant');
  const [prompt, setPrompt]               = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('Hello! 👋 How can I help you today?');
  const [menuOptions, setMenuOptions]     = useState<string[]>(['📦 Our Products & Services', '📅 Book Appointment', '💬 Contact Us']);
  
  const [kbDocs, setKbDocs]       = useState<any[]>([]);
  const [newFact, setNewFact]     = useState('');
  const [isAddingFact, setIsAddingFact] = useState(false);

  // Integrations state
  const [bookingUrl, setBookingUrl] = useState('');
  const [stripeSecret, setStripeSecret] = useState('');
  const [paystackSecret, setPaystackSecret] = useState('');
  const [hasStripe, setHasStripe] = useState(false);
  const [hasPaystack, setHasPaystack] = useState(false);
  const [isSavingIntegrations, setIsSavingIntegrations] = useState(false);

  // Scraper & Magic Setup
  const [magicInput, setMagicInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<string | null>(null);

  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Document upload
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Training
  const [trainingQuestions, setTrainingQuestions] = useState<string[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingAnswers, setTrainingAnswers] = useState<Record<number, string>>({});

  useEffect(() => {
    (async () => {
      const bot = await getBotSettings();
      if (bot.success && bot.bot) {
        setBotName(bot.bot.name || '');
        setPrompt(bot.bot.prompt || '');
        setWelcomeMessage(bot.bot.welcome_message || '');
        setMenuOptions(bot.bot.menu_options || []);
      }
      
      const kb = await getKnowledgeBaseDocs();
      if (kb.success) setKbDocs(kb.documents || []);

      const ints = await getMerchantIntegrations();
      if (ints.success) {
        setBookingUrl(ints.integrations.booking_url);
        setHasStripe(ints.integrations.has_stripe);
        setHasPaystack(ints.integrations.has_paystack);
      }
    })();
  }, []);

  const handleSaveAll = async () => {
    setIsSaving(true);
    await saveBotSettings(botName, prompt, welcomeMessage, menuOptions);
    setSaved(true);
    setIsSaving(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSaveIntegrations = async () => {
    setIsSavingIntegrations(true);
    const res = await saveMerchantIntegrations({ 
      booking_url: bookingUrl, 
      stripe_secret: stripeSecret || undefined, 
      paystack_secret: paystackSecret || undefined 
    });
    if (res.success) {
      setStripeSecret('');
      setPaystackSecret('');
      const ints = await getMerchantIntegrations();
      if (ints.success) {
        setHasStripe(ints.integrations.has_stripe);
        setHasPaystack(ints.integrations.has_paystack);
      }
    }
    setIsSavingIntegrations(false);
  };

  const handleMagicSetup = async () => {
    if (!magicInput.trim()) return;
    setIsGenerating(true);
    const res = await generateBotConfig(magicInput);
    if (res.success) {
      setBotName(res.botName!);
      setPrompt(res.prompt!);
      setWelcomeMessage(res.welcomeMessage!);
      setMenuOptions(res.menuOptions!);
    }
    setIsGenerating(false);
  };

  const handleAddFact = async () => {
    if (!newFact.trim()) return;
    setIsAddingFact(true);
    const res = await addKnowledgeFact(newFact);
    if (res.success) {
      setKbDocs([res.document, ...kbDocs]);
      setNewFact('');
    }
    setIsAddingFact(false);
  };

  const handleDeleteFact = async (id: string) => {
    await deleteKnowledgeFact(id);
    setKbDocs(kbDocs.filter(d => d.id !== id));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const res = await processDocumentUpload(base64, file.name);
      if (res.success) {
        const kb = await getKnowledgeBaseDocs();
        if (kb.success) setKbDocs(kb.documents || []);
      }
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleScrape = async () => {
    if (!magicInput.trim()) return;
    setIsScraping(true);
    setScrapeResult(null);
    const res = await scrapeWebsiteToKnowledgeBase(magicInput);
    if (res.success) {
      setScrapeResult(`✅ God-Mode: Extracted ${res.count} facts.`);
      const kb = await getKnowledgeBaseDocs();
      if (kb.success) setKbDocs(kb.documents || []);
    } else {
      setScrapeResult(`❌ Error: ${res.error}`);
    }
    setIsScraping(false);
  };

  const handleGetTraining = async () => {
    setIsTraining(true);
    const res = await getTrainingQuestions();
    if (res.success) setTrainingQuestions(res.questions);
    setIsTraining(false);
  };

  const handleSaveTraining = async (idx: number) => {
    const ans = trainingAnswers[idx];
    if (!ans) return;
    await submitTrainingAnswer(trainingQuestions[idx], ans);
    setTrainingAnswers(prev => ({ ...prev, [idx]: '' }));
    const kb = await getKnowledgeBaseDocs();
    if (kb.success) setKbDocs(kb.documents || []);
  };

  const commonSectionStyle: React.CSSProperties = { padding: '28px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' };

  return (
    <div style={{ display: 'flex', width: '100%', gap: '30px', paddingBottom: '80px' }}>
      <main style={{ flex: 1, paddingTop: '40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        <header>
          <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', background: 'linear-gradient(135deg,#fff,#888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ChatSela Intelligence Engine 🦾
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>Configure your white-labeled autonomous sales engine. Universal integrations for payments and bookings.</p>
        </header>

        {/* ── Magic Setup / Scraper ── */}
        <section style={commonSectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <span style={{ fontSize: '20px' }}>🔥</span>
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>God-Mode Scraper (God Mode)</h3>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>Enter your website URL. ChatSela will crawl your entire site (pricing, services, features) to build 100% factual business IQ.</p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input type="text" value={magicInput} onChange={(e) => setMagicInput(e.target.value)} placeholder="e.g. www.yourbusiness.com" style={INPUT_STYLE} />
            <button onClick={handleScrape} disabled={isScraping} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
               {isScraping ? '⌛ Scraping...' : '🌐 Scrape URL'}
            </button>
            <button onClick={handleMagicSetup} disabled={isGenerating} style={{ background: 'linear-gradient(135deg,#00ff88,#00d4ff)', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
               {isGenerating ? '⌛ Generating...' : '✨ Auto-Config Bot'}
            </button>
          </div>
          {scrapeResult && <p style={{ marginTop: '12px', fontSize: '13px', color: scrapeResult.startsWith('✅') ? '#00ff88' : '#ef4444' }}>{scrapeResult}</p>}
        </section>

        {/* ── Payments & Calendar Integrations ── */}
        <section style={{ ...commonSectionStyle, borderLeft: '4px solid #00ff88' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <span style={{ fontSize: '20px' }}>💳</span>
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Payments & Appointments</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>📅 Custom Booking URL (Cal.com / Calendly)</label>
              <input type="text" value={bookingUrl} onChange={(e) => setBookingUrl(e.target.value)} placeholder="https://cal.com/your-business" style={INPUT_STYLE} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Stripe Secret {hasStripe && <span style={{ color: '#00ff88' }}>(Active ✅)</span>}
                </label>
                <input type="password" value={stripeSecret} onChange={(e) => setStripeSecret(e.target.value)} placeholder="sk_test_..." style={INPUT_STYLE} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Paystack Secret {hasPaystack && <span style={{ color: '#00ff88' }}>(Active ✅)</span>}
                </label>
                <input type="password" value={paystackSecret} onChange={(e) => setPaystackSecret(e.target.value)} placeholder="sk_test_..." style={INPUT_STYLE} />
              </div>
            </div>
            <button onClick={handleSaveIntegrations} disabled={isSavingIntegrations} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '12px 24px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' }}>
              {isSavingIntegrations ? '⌛ Saving...' : '💾 Save Integrations'}
            </button>
          </div>
        </section>

        {/* ── Knowledge Vault ── */}
        <section style={commonSectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🧠</span>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>The Knowledge Vault</h3>
            </div>
            <p style={{ fontSize: '13px', color: '#00ff88' }}>{kbDocs.length} Facts Verified</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <input type="text" value={newFact} onChange={(e) => setNewFact(e.target.value)} placeholder="Add a business fact manually..." style={INPUT_STYLE} />
            <button onClick={handleAddFact} disabled={isAddingFact} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
              Add
            </button>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <input ref={fileInputRef} type="file" accept=".pdf,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px dashed rgba(139,92,246,0.3)', padding: '14px', width: '100%', borderRadius: '12px', cursor: 'pointer', fontWeight: 600 }}>
               {isUploading ? '⌛ Processing PDF...' : '📄 Click to Upload Business Brochure / PDF'}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
            {kbDocs.map(doc => (
              <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '14px', lineHeight: '1.5' }}>{doc.content}</p>
                <button onClick={() => handleDeleteFact(doc.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
              </div>
            ))}
          </div>
        </section>

        {/* ── Bot Identity ── */}
        <section style={commonSectionStyle}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>🪪 Bot Identity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px' }}>Assistant Name</label>
              <input type="text" value={botName} onChange={(e) => setBotName(e.target.value)} style={INPUT_STYLE} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px' }}>Sales Protocol (The Core Brain)</label>
              <textarea rows={6} value={prompt} onChange={(e) => setPrompt(e.target.value)} style={{ ...INPUT_STYLE, resize: 'vertical' }} />
            </div>
          </div>
        </section>

        {/* ── Interactive Training ── */}
        <section style={{ ...commonSectionStyle, borderLeft: '4px solid #f59e0b' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
             <h3 style={{ fontSize: '18px', fontWeight: 700 }}>🎓 Fortify Intelligence</h3>
             <button onClick={handleGetTraining} disabled={isTraining} style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
               {isTraining ? 'Analyzing...' : 'Find Knowledge Gaps'}
             </button>
           </div>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
             {trainingQuestions.map((q, idx) => (
                <div key={idx} style={{ padding: '20px', background: 'rgba(245,158,11,0.05)', borderRadius: '16px', border: '1px solid rgba(245,158,11,0.1)' }}>
                  <p style={{ fontWeight: 600, color: '#f59e0b', marginBottom: '12px' }}>❓ {q}</p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" value={trainingAnswers[idx] || ''} onChange={(e) => setTrainingAnswers(p => ({ ...p, [idx]: e.target.value }))} style={INPUT_STYLE} placeholder="Your answer..." />
                    <button onClick={() => handleSaveTraining(idx)} style={{ background: '#00ff88', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Save</button>
                  </div>
                </div>
             ))}
           </div>
        </section>

        <button className="glow-btn" style={{ padding: '16px 40px', width: 'fit-content' }} onClick={handleSaveAll} disabled={isSaving}>
           {isSaving ? '⌛ Saving Engine Configuration...' : saved ? '✅ Configuration Saved!' : '💾 Save & Deploy Engine'}
        </button>

      </main>

      <aside style={{ width: '380px', flexShrink: 0, paddingTop: '40px' }}>
        <div style={{ position: 'sticky', top: '20px', background: '#0b141a', borderRadius: '32px', padding: '20px', border: '8px solid #1e2a30', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
           <p style={{ textAlign: 'center', fontSize: '12px', color: '#8696a0', marginBottom: '16px', letterSpacing: '0.1em', fontWeight: 600 }}>CHATSZELA LIVE PREVIEW</p>
           
           <div style={{ borderBottom: '1px solid #1e2a30', paddingBottom: '16px', marginBottom: '16px', display: 'flex', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg,#00a884, #00d4ff)' }} />
              <div><p style={{ fontSize: '15px', fontWeight: '700' }}>{botName}</p><p style={{ fontSize: '11px', color: '#00ff88' }}>Engine Online 🟢</p></div>
           </div>

           <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '300px' }}>
             <div style={{ background: '#202c33', padding: '12px 16px', borderRadius: '0 16px 16px 16px', fontSize: '14px', maxWidth: '85%' }}>{welcomeMessage}</div>
             {menuOptions.map((o, i) => o && <div key={i} style={{ padding: '12px', background: 'rgba(0,168,132,0.1)', color: '#00ff88', borderRadius: '12px', textAlign: 'center', fontSize: '13px', border: '1px solid rgba(0,168,132,0.3)', fontWeight: 600 }}>{o}</div>)}
           </div>

           <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(0,255,136,0.05)', borderRadius: '16px', border: '1px solid rgba(0,255,136,0.1)' }}>
             <p style={{ fontSize: '11px', color: '#00ff88', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>Intelligence Metrics</p>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>KB Status</span>
               <span style={{ fontSize: '14px', fontWeight: 700 }}>{kbDocs.length} Verified Facts</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
               <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Integrations</span>
               <span style={{ fontSize: '12px', color: '#00ff88' }}>{ (hasStripe ? 1 : 0) + (hasPaystack ? 1 : 0) + (bookingUrl ? 1 : 0) } / 3 Active</span>
             </div>
           </div>
        </div>
      </aside>
    </div>
  );
}
