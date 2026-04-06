'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  getKnowledgeBaseDocs,
  addKnowledgeFact,
  deleteKnowledgeFact,
  processDocumentUpload,
  getTrainingQuestions,
  submitTrainingAnswer,
  scrapeWebsiteToKnowledgeBase,
  magicFillKnowledge,
  saveBotSettings,
  getBotSettings,
  generateBotConfig,
  getKnowledgeGaps,
  resolveKnowledgeGap
} from '../bot/actions';
import VoiceTraining from '@/components/VoiceTraining';
import PricingLedger from '../bot/PricingLedger';

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

export default function TrainBotPage() {
  const [botName, setBotName] = useState('My Sales Assistant');
  const [prompt, setPrompt] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [menuOptions, setMenuOptions] = useState<string[]>([]);
  
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

  // Document upload
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Training
  const [trainingQuestions, setTrainingQuestions] = useState<string[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingAnswers, setTrainingAnswers] = useState<Record<number, string>>({});

  // Knowledge Gaps (Self-Healing Loop)
  const [gaps, setGaps] = useState<any[]>([]);
  const [gapAnswers, setGapAnswers] = useState<Record<string, string>>({});
  const [resolvingGap, setResolvingGap] = useState<string | null>(null);

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

      const gapsRes = await getKnowledgeGaps();
      if (gapsRes.success) setGaps(gapsRes.gaps || []);
    })();
  }, []);

  const handleMagicSetup = async () => {
    if (!magicInput.trim()) return;
    setIsGenerating(true);
    const res = await generateBotConfig(magicInput);
    if (res.success) {
      setBotName(res.botName!);
      setPrompt(res.prompt!);
      setWelcomeMessage(res.welcomeMessage!);
      setMenuOptions(res.menuOptions!);
      await saveBotSettings(res.botName!, res.prompt!, res.welcomeMessage!, res.menuOptions!);
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
    setKbDocs(kbDocs.filter((d: any) => d.id !== id));
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
    const { saveCategorizedIntelligence } = await import('../bot/actions');
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

  const [activeTab, setActiveTab] = useState<'services' | 'products' | 'iq' | 'gaps'>('services');

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

  const handleResolveGap = async (gap: any) => {
    const answer = gapAnswers[gap.id];
    if (!answer?.trim()) return;
    setResolvingGap(gap.id);
    const res = await resolveKnowledgeGap(gap.id, gap.question, answer, gap.customer_phone);
    if (res.success) {
      setGaps(prev => prev.map(g => g.id === gap.id ? { ...g, status: 'resolved', answer } : g));
      setGapAnswers(prev => ({ ...prev, [gap.id]: '' }));
    }
    setResolvingGap(null);
  };

  const commonSectionStyle: React.CSSProperties = { padding: '28px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' };

  return (
    <div style={{ display: 'flex', width: '100%', gap: '30px', paddingBottom: '80px' }}>
      <main style={{ flex: 1, paddingTop: '40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        <header>
          <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', background: 'linear-gradient(135deg,#fff,#888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🎓 Train Your Bot
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>Make your AI smarter by feeding it knowledge directly or letting it crawl your website.</p>
        </header>

        {/* ── 🧠 Intelligence Command Center ── */}
        <section style={{ ...commonSectionStyle, borderLeft: '4px solid var(--accent-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>🤖 Deep Training Lab</h3>
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px' }}>
              {(['services', 'products', 'iq', 'gaps'] as const).map(tab => (
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
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  {tab === 'gaps' ? '🔔 GAPS' : tab.toUpperCase()}
                  {tab === 'gaps' && gaps.filter(g => g.status === 'pending').length > 0 && (
                    <span style={{
                      position: 'absolute', top: '-4px', right: '-4px',
                      background: '#ef4444', color: '#fff', fontSize: '9px', fontWeight: 800,
                      borderRadius: '50%', width: '18px', height: '18px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      animation: 'pulse 2s infinite'
                    }}>
                      {gaps.filter(g => g.status === 'pending').length}
                    </span>
                  )}
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

          {activeTab === 'gaps' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'rgba(239,68,68,0.05)', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.15)' }}>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                  <strong>🔔 Knowledge Gaps Inbox</strong> — These are real customer questions your bot couldn't answer.
                  Type the correct answer below, and ChatSela will <strong>instantly reply to the customer on WhatsApp</strong> and permanently learn the answer.
                </p>
              </div>

              {gaps.filter(g => g.status === 'pending').length === 0 && gaps.filter(g => g.status === 'resolved').length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', opacity: 0.4 }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
                  <p style={{ fontSize: '15px' }}>No knowledge gaps! Your bot knows everything it needs.</p>
                </div>
              )}

              {gaps.filter(g => g.status === 'pending').map(gap => (
                <div key={gap.id} style={{
                  padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px',
                  border: '1px solid rgba(239,68,68,0.2)', borderLeft: '4px solid #ef4444'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>❓ {gap.question}</p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>From: {gap.customer_phone} · {new Date(gap.created_at).toLocaleString()}</p>
                    </div>
                    <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '10px', fontWeight: 700 }}>PENDING</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="Type the correct answer..."
                      value={gapAnswers[gap.id] || ''}
                      onChange={e => setGapAnswers(prev => ({ ...prev, [gap.id]: e.target.value }))}
                      style={{ ...INPUT_STYLE, flex: 1 }}
                      onKeyDown={e => e.key === 'Enter' && handleResolveGap(gap)}
                    />
                    <button
                      onClick={() => handleResolveGap(gap)}
                      disabled={resolvingGap === gap.id || !gapAnswers[gap.id]?.trim()}
                      style={{
                        background: 'linear-gradient(135deg, #00ff88, #00d4ff)', border: 'none', color: '#000',
                        padding: '12px 24px', borderRadius: '12px', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                        opacity: resolvingGap === gap.id ? 0.6 : 1
                      }}
                    >
                      {resolvingGap === gap.id ? '⌛ Resolving...' : '✅ Resolve & Reply'}
                    </button>
                  </div>
                </div>
              ))}

              {gaps.filter(g => g.status === 'resolved').length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <h5 style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>✅ Resolved ({gaps.filter(g => g.status === 'resolved').length})</h5>
                  {gaps.filter(g => g.status === 'resolved').slice(0, 10).map(gap => (
                    <div key={gap.id} style={{
                      padding: '14px', background: 'rgba(0,255,136,0.03)', borderRadius: '14px',
                      border: '1px solid rgba(0,255,136,0.1)', marginBottom: '8px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: 600 }}>❓ {gap.question}</p>
                        <p style={{ fontSize: '12px', color: '#00ff88', marginTop: '4px' }}>✅ {gap.answer}</p>
                      </div>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{new Date(gap.resolved_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
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
                        <input 
                            type="text" 
                            value={f} 
                            placeholder="Enter business fact..."
                            onChange={(e) => updateDraft(category, i, e.target.value)} 
                            style={{ ...INPUT_STYLE, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }} 
                          />
                        <button onClick={() => removeDraft(category, i)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>✕</button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

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
            {kbDocs.map((doc: any) => (
              <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '14px', lineHeight: '1.5' }}><span style={{ color: 'var(--accent-primary)', fontSize: '10px', textTransform: 'uppercase', marginRight: '8px' }}>[{doc.category || 'general'}]</span>{doc.content}</p>
                <button onClick={() => handleDeleteFact(doc.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
