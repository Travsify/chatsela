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
  resolveKnowledgeGap,
  saveCategorizedIntelligence
} from './actions';
import VoiceTraining from '@/components/VoiceTraining';
import PricingLedger from './PricingLedger';
import WhatsAppConnector from '@/components/WhatsAppConnector';

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

export default function IntelligenceHubPage() {
  // Bot Settings
  const [botName, setBotName] = useState('My Sales Assistant');
  const [prompt, setPrompt] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('Hello! 👋 How can I help you today?');
  const [menuOptions, setMenuOptions] = useState<string[]>([]);
  
  // KB & Training
  const [kbDocs, setKbDocs] = useState<any[]>([]);
  const [newFact, setNewFact] = useState('');
  const [isAddingFact, setIsAddingFact] = useState(false);
  const [gaps, setGaps] = useState<any[]>([]);
  
  // States
  const [isSaving, setIsSaving] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [magicInput, setMagicInput] = useState('');
  const [activeTab, setActiveTab] = useState<'identity' | 'knowledge' | 'training' | 'lab' | 'whatsapp'>('identity');
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    (async () => {
      // Check query param for tab
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam === 'whatsapp') {
        setActiveTab('whatsapp');
      }

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

  const handleSaveAll = async () => {
    setIsSaving(true);
    await saveBotSettings(botName, prompt, welcomeMessage, menuOptions);
    setIsSaving(false);
    alert('✅ Intelligence Hub Updated');
  };

  const handleAddFact = async () => {
    if (!newFact.trim()) return;
    setIsAddingFact(true);
    const res = await addKnowledgeFact(newFact);
    if (res.success && res.document) {
      setKbDocs([res.document, ...kbDocs]);
      setNewFact('');
    }
    setIsAddingFact(false);
  };

  const handleDeleteFact = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fact?')) return;
    const res = await deleteKnowledgeFact(id);
    if (res.success) {
      setKbDocs(kbDocs.filter(d => d.id !== id));
    } else {
      alert('❌ Delete failed');
    }
  };

  const handleResolveGap = async (gap: any, answer: string) => {
    if (!answer.trim()) return;
    const res = await resolveKnowledgeGap(gap.id, gap.question, answer, gap.customer_phone || '');
    if (res.success) {
      setGaps(gaps.filter(g => g.id !== gap.id));
      const kb = await getKnowledgeBaseDocs();
      if (kb.success) setKbDocs(kb.documents || []);
      alert('✅ Training Integrated!');
    } else {
      alert('❌ Failed to resolve gap.');
    }
  };

  return (
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '32px', padding: '40px' }}>
      
      <header>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', background: 'linear-gradient(135deg,#fff,#888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🧠 Intelligence Hub
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>The central nervous system for your AI Bot. Configure identity, facts, and training here.</p>
      </header>

      {/* ── TAB NAVIGATION ── */}
      <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '16px', alignSelf: 'flex-start' }}>
        {(['whatsapp', 'identity', 'knowledge', 'training', 'lab'] as const).map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            style={{ 
              padding: '10px 24px', 
              borderRadius: '12px', 
              border: 'none', 
              fontSize: '14px', 
              fontWeight: 700, 
              cursor: 'pointer',
              background: activeTab === tab ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === tab ? '#000' : 'rgba(255,255,255,0.5)',
              transition: 'all 0.2s'
            }}
          >
            {tab === 'lab' ? '🧪 LAB' : tab === 'whatsapp' ? '📱 WHATSAPP' : tab.toUpperCase()}
          </button>
        ))}
      </div>

      {activeTab === 'whatsapp' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <WhatsAppConnector />
        </section>
      )}

      {activeTab === 'identity' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={commonSectionStyle}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>🪪 Bot Identity</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px' }}>Assistant Name</label>
                  <input type="text" value={botName} onChange={(e) => setBotName(e.target.value)} style={INPUT_STYLE} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px' }}>First Message (Icebreaker)</label>
                  <input type="text" value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} style={INPUT_STYLE} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px' }}>Sales Protocol (Core Logic)</label>
                <textarea rows={8} value={prompt} onChange={(e) => setPrompt(e.target.value)} style={{ ...INPUT_STYLE, resize: 'vertical' }} />
              </div>
              <button 
                className="glow-btn" 
                style={{ alignSelf: 'flex-start', padding: '12px 32px' }}
                onClick={handleSaveAll}
                disabled={isSaving}
              >
                {isSaving ? '⌛ Saving Identity...' : 'Save Identity'}
              </button>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'knowledge' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* MAGIC SYNC SECTION */}
          <div style={{ ...commonSectionStyle, borderLeft: '4px solid #3b82f6' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>🌐 Website Sync (Scraper)</h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginBottom: '20px' }}>Point your AI to your website, and it will learn everything about your business in real-time.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input type="text" value={magicInput} onChange={(e) => setMagicInput(e.target.value)} placeholder="https://yourwebsite.com" style={INPUT_STYLE} />
              <button 
                className="glow-btn" 
                style={{ padding: '0 24px', background: isScraping ? '#333' : '#3b82f6', color: '#fff', minWidth: '160px' }}
                disabled={isScraping || !magicInput}
                onClick={async () => {
                  setIsScraping(true);
                  try {
                    const res = await scrapeWebsiteToKnowledgeBase(magicInput);
                    if (res.success) {
                      alert('✅ Website synced! Your AI now knows your business.');
                      const docsRes = await getKnowledgeBaseDocs();
                      if (docsRes.documents) setKbDocs(docsRes.documents);
                    } else {
                      alert('❌ Sync failed: ' + (res.error || 'Unknown error'));
                    }
                  } catch (e: any) {
                    alert('❌ Error: ' + e.message);
                  }
                  setIsScraping(false);
                }}
              >
                {isScraping ? '⏳ SYNCING...' : '🚀 MAGIC SYNC'}
              </button>
            </div>
          </div>

          <div style={commonSectionStyle}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>📦 Knowledge Vault</h3>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <input type="text" value={newFact} onChange={(e) => setNewFact(e.target.value)} placeholder="Add a specific fact manually..." style={INPUT_STYLE} />
              <button className="glow-btn" style={{ padding: '0 24px' }} onClick={handleAddFact} disabled={isAddingFact}>ADD FACT</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
              {kbDocs.map((doc: any) => (
                <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
                    <span style={{ color: 'var(--accent-primary)', fontSize: '10px', marginRight: '8px' }}>[{doc.category || 'FACT'}]</span>
                    {doc.content}
                  </p>
                  <button style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => handleDeleteFact(doc.id)}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'training' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={commonSectionStyle}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>🔔 Knowledge Gaps</h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '24px' }}>These are questions your bot couldn't answer. Replying here turns them into permanent knowledge.</p>
            {gaps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', opacity: 0.3 }}>No gaps detected. Your AI is fully briefed!</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {gaps.map((gap: any) => (
                  <div key={gap.id} style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontWeight: 700, fontSize: '15px' }}>❓ {gap.question}</p>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                      <input 
                        id={`gap-ans-${gap.id}`}
                        placeholder="Answer this question..." 
                        style={INPUT_STYLE} 
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleResolveGap(gap, (e.target as HTMLInputElement).value);
                          }
                        }}
                      />
                      <button 
                        className="glow-btn" 
                        style={{ padding: '0 20px', fontSize: '12px' }}
                        onClick={() => {
                          const val = (document.getElementById(`gap-ans-${gap.id}`) as HTMLInputElement).value;
                          handleResolveGap(gap, val);
                        }}
                      >
                        REPLY & TRAIN
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'lab' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ ...commonSectionStyle, borderLeft: '4px solid var(--accent-primary)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>🧪 Intelligence Lab (AGI Verified)</h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginBottom: '24px' }}>
              Want to see your AI in action? Ask a question about your products or business. 
              The AI will **sweep your website in real-time** to find the answer, proving its God-Mode capabilities.
            </p>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <input 
                placeholder="e.g. Do we have any new pricing for the luxury model?" 
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                style={INPUT_STYLE} 
              />
              <button 
                className="glow-btn" 
                disabled={isTesting || !testQuery}
                onClick={async () => {
                  setIsTesting(true);
                  setTestResult(null);
                  const { testIntelligence } = await import('./actions');
                  const res = await testIntelligence(testQuery);
                  setTestResult(res.answer);
                  setIsTesting(false);
                }}
                style={{ padding: '0 24px' }}
              >
                {isTesting ? '⌛ SCANNING...' : 'TEST AI ENGINE'}
              </button>
            </div>

            {testResult && (
              <div style={{ padding: '24px', borderRadius: '20px', background: 'rgba(0,255,136,0.03)', border: '1px solid rgba(0,255,136,0.1)' }}>
                <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '8px', textTransform: 'uppercase' }}>AI Response:</p>
                <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#fff' }}>{testResult}</p>
                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                  <span style={{ color: '#00ff88' }}>●</span> Verified via Real-time Web Intelligence
                </div>
              </div>
            )}
          </div>
        </section>
      )}

    </main>
  );
}
