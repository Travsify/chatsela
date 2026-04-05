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
  generateBotConfig, 
  magicFillKnowledge 
} from './actions';
import VoiceTraining from '@/components/VoiceTraining';
import PricingLedger from './PricingLedger';
import { createClient } from '@/utils/supabase/client';

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

  // Scraper & Magic Setup
  const [magicInput, setMagicInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapingPhase, setScrapingPhase] = useState<string | null>(null);
  const [scrapeResult, setScrapeResult] = useState<string | null>(null);
  const [categorizedDrafts, setCategorizedDrafts] = useState<Record<string, string[]> | null>(null);
  const [draftSourceUrl, setDraftSourceUrl] = useState('');
  const [isSavingDrafts, setIsSavingDrafts] = useState(false);

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
    })();
  }, []);

  const handleSaveAll = async () => {
    setIsSaving(true);
    await saveBotSettings(botName, prompt, welcomeMessage, menuOptions);
    setSaved(true);
    setIsSaving(false);
    setTimeout(() => setSaved(false), 3000);
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
    setScrapeResult(null);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const res = await processDocumentUpload(base64, file.name);
        if (res.success) {
          setCategorizedDrafts(res.categorizedFacts);
          setDraftSourceUrl(`Document: ${res.fileName}`);
          setScrapeResult(`✅ PDF Intelligence Extracted. Please review folders.`);
        } else {
          setScrapeResult(`❌ Error: ${res.error}`);
        }
      } catch (err: any) {
        setScrapeResult(`❌ Error: Failed to process document. Please try again.`);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleScrape = async () => {
    if (!magicInput.trim()) return;
    setIsScraping(true);
    setScrapeResult(null);
    
    // 📡 Intelligent Phase Sequence (Branded ChatSela)
    const phases = [
      "📡 Connecting to ChatSela Intelligence Core...",
      "🌐 Discovering business sub-pages (pricing, services, about)...",
      "🧹 Cleaning raw data for AI synthesis...",
      "🧠 Analyzing business facts & extracting value...",
      "💾 Securing verified facts in the Knowledge Vault..."
    ];
    
    let phaseIdx = 0;
    setScrapingPhase(phases[0]);
    const phaseInterval = setInterval(() => {
      phaseIdx++;
      if (phaseIdx < phases.length) setScrapingPhase(phases[phaseIdx]);
    }, 5000);

    try {
      const res = await scrapeWebsiteToKnowledgeBase(magicInput);
      if (res.success) {
        setCategorizedDrafts(res.categorizedFacts);
        setDraftSourceUrl(res.targetUrl);
        setScrapeResult(`✅ Website Intelligence Extracted. Please review folders.`);
      } else {
        setScrapeResult(`❌ Error: ${res.error}`);
      }
    } finally {
      clearInterval(phaseInterval);
      setScrapingPhase(null);
      setIsScraping(false);
    }
  };

  const handleSaveDrafts = async () => {
    if (!categorizedDrafts) return;
    setIsSavingDrafts(true);
    const { saveCategorizedIntelligence } = await import('./actions');
    const res = await saveCategorizedIntelligence(categorizedDrafts, draftSourceUrl);
    if (res.success) {
      setCategorizedDrafts(null);
      setScrapeResult(`✅ Intelligence sync complete: ${res.count} facts deployed.`);
      const kb = await getKnowledgeBaseDocs();
      if (kb.success) setKbDocs(kb.documents || []);
    }
    setIsSavingDrafts(false);
  };

  const handleVoiceTranscription = async (cats: any, trans: string, insts?: string[]) => {
    setCategorizedDrafts(cats);
    setDraftSourceUrl(`Voice Note: ${trans.substring(0, 30)}...`);
    setScrapeResult(`✅ Voice Intelligence Transcribed. Please review folders.`);
    
    if (insts && insts.length > 0) {
      const newPrompt = `${insts.join('\n')}\n\n${prompt}`;
      setPrompt(newPrompt);
      await saveBotSettings(botName, newPrompt, welcomeMessage, menuOptions);
    }
  };

  const [activeTab, setActiveTab] = useState<'products' | 'services' | 'iq'>('services');

  const handleMagicFill = async (category: string) => {
    setIsGenerating(true);
    const res = await magicFillKnowledge(category, botName);
    if (res.success && res.suggestions) {
       setCategorizedDrafts({ ...categorizedDrafts, [category]: res.suggestions });
       setScrapeResult(`✨ Magic Bridge Complete: Suggested 5 facts for ${category}.`);
    } else {
       alert(`Magic Fill failed: ${res.error}`);
    }
    setIsGenerating(false);
  };

  const addDraft = (cat: string) => {
    if (!categorizedDrafts) return;
    const newDrafts = { ...categorizedDrafts };
    if (!newDrafts[cat]) newDrafts[cat] = [];
    newDrafts[cat].push('');
    setCategorizedDrafts(newDrafts);
  };

  const updateDraft = (cat: string, idx: number, val: string) => {
    if (!categorizedDrafts) return;
    const newDrafts = { ...categorizedDrafts };
    newDrafts[cat][idx] = val;
    setCategorizedDrafts(newDrafts);
  };

  const removeDraft = (cat: string, idx: number) => {
    if (!categorizedDrafts) return;
    const newDrafts = { ...categorizedDrafts };
    newDrafts[cat].splice(idx, 1);
    setCategorizedDrafts(newDrafts);
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
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>God-Mode Scraper</h3>
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
          {isScraping && scrapingPhase && (
            <div style={{ marginTop: '20px', padding: '16px', borderRadius: '16px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', gap: '12px', animation: 'pulse 2s infinite' }}>
              <div className="spinner-small" />
              <p style={{ fontSize: '14px', color: '#60a5fa', fontWeight: 600 }}>{scrapingPhase}</p>
            </div>
          )}
          {scrapeResult && <p style={{ marginTop: '12px', fontSize: '13px', color: scrapeResult.startsWith('✅') ? '#00ff88' : '#ef4444' }}>{scrapeResult}</p>}

          {/* 📂 Categorized Review Section */}
          {categorizedDrafts && (
            <div style={{ marginTop: '30px', animation: 'fadeIn 0.5s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent-primary)' }}>🗃️ Review Intelligence Folders</h4>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Source: {draftSourceUrl}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {Object.entries(categorizedDrafts).sort().map(([cat, facts]) => (
                  <div key={cat} className="glass" style={{ padding: '20px', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h5 style={{ textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📁 {cat} <span style={{ color: 'var(--accent-primary)', fontSize: '10px' }}>({facts.length})</span>
                      </h5>
                      <button onClick={() => addDraft(cat)} style={{ background: 'rgba(0,255,136,0.1)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.2)', borderRadius: '8px', padding: '4px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>➕ Add Fact</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {facts.map((f, i) => (
                        <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)', opacity: 0.5 }} />
                          <input 
                            type="text" 
                            value={f} 
                            placeholder="Enter business fact..."
                            onChange={(e) => updateDraft(cat, i, e.target.value)} 
                            style={{ ...INPUT_STYLE, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }} 
                          />
                          <button onClick={() => removeDraft(cat, i)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>✕</button>
                        </div>
                      ))}
                      {facts.length === 0 && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>No facts extracted for this category. Click "Add Fact" to manual entries.</p>}
                    </div>
                  </div>
                ))}
              </div>
              <button 
                onClick={handleSaveDrafts} 
                disabled={isSavingDrafts}
                className="glow-btn" 
                style={{ marginTop: '24px', width: '100%' }}
              >
                {isSavingDrafts ? '⌛ Deploying Intelligence...' : '🚀 Finalize & Go Live'}
              </button>
            </div>
          )}
        </section>

        <section style={{ ...commonSectionStyle, opacity: 0.6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <span style={{ fontSize: '20px' }}>🛡️</span>
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>System Integrations</h3>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
            Payment gateways and calendar links are now managed under <a href="/dashboard/settings" style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'underline' }}>Settings</a>.
          </p>
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
                <p style={{ fontSize: '14px', lineHeight: '1.5' }}><span style={{ color: 'var(--accent-primary)', fontSize: '10px', textTransform: 'uppercase', marginRight: '8px' }}>[{doc.category || 'general'}]</span>{doc.content}</p>
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

        {/* ── 🧠 Intelligence Command Center ── */}
        <section style={{ ...commonSectionStyle, borderLeft: '4px solid var(--accent-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>🤖 Deep Training Lab</h3>
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px' }}>
              {(['services', 'products', 'iq'] as const).map(tab => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: '8px', 
                    border: 'none', 
                    fontSize: '12px', 
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: activeTab === tab ? 'var(--accent-primary)' : 'transparent',
                    color: activeTab === tab ? '#000' : 'rgba(255,255,255,0.5)',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'services' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <PricingLedger />
              <div style={{ padding: '20px', background: 'rgba(0,168,132,0.05)', borderRadius: '20px', border: '1px solid rgba(0,168,132,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div>
                   <h5 style={{ fontWeight: 700, fontSize: '14px', color: 'var(--accent-primary)' }}>✨ Magic Service Fill</h5>
                   <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Let AI analyze your business and suggest professional service rates and descriptions.</p>
                 </div>
                 <button onClick={() => handleMagicFill('pricing')} disabled={isGenerating} className="glow-btn" style={{ padding: '8px 20px', fontSize: '12px' }}>
                   {isGenerating ? '⌛ Processing...' : 'Generate Rates ✨'}
                 </button>
              </div>
            </div>
          )}

          {activeTab === 'iq' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', gap: '15px' }}>
                 <button onClick={() => handleMagicFill('about')} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '12px', cursor: 'pointer' }}>Generate "About" Facts ✨</button>
                 <button onClick={() => handleMagicFill('features')} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '12px', cursor: 'pointer' }}>Generate "Features" ✨</button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <VoiceTraining onTranscription={(cats, trans) => handleVoiceTranscription(cats, trans)} />
                <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h5 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', color: 'rgba(255,255,255,0.6)' }}>🧠 Self-Learning Hub</h5>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.6' }}>Your bot learns from every interaction. Instructions detected via voice or magic-fill are applied directly to the core prompt.</p>
                </div>
              </div>
            </div>
          )}

          {/* 📂 Categorized Drafts Review (Unified UI) */}
          {categorizedDrafts && (
            <div style={{ marginTop: '30px', padding: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '15px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 800 }}>🛡️ Intelligence Review: {draftSourceUrl}</h4>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={handleSaveDrafts} disabled={isSavingDrafts} style={{ background: '#00ff88', color: '#000', border: 'none', padding: '10px 24px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}>{isSavingDrafts ? '⌛ Saving...' : 'Finalize Intelligence & Go Live 🚀'}</button>
                  <button onClick={() => setCategorizedDrafts(null)} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>Discard</button>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                {Object.entries(categorizedDrafts).map(([category, facts]) => (
                  <div key={category} className="folder" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', borderTop: '4px solid var(--accent-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-primary)' }}>📁 {category}</span>
                      <button onClick={() => addDraft(category)} style={{ background: 'none', border: 'none', color: '#00ff88', fontSize: '18px', cursor: 'pointer' }}>+</button>
                    </div>
                    {facts.map((f, i) => (
                      <div key={i} style={{ fontSize: '11px', marginBottom: '8px', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', gap: '8px' }}>
                        <span style={{ color: '#00ff88' }}>•</span>
                        <p style={{ flex: 1 }}>{f}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
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
           </div>
        </div>
      </aside>
    </div>
  );
}
