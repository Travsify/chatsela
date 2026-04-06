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
  const [activeTab, setActiveTab] = useState<'identity' | 'knowledge' | 'training'>('identity');

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
    if (res.success) {
      setKbDocs([res.document, ...kbDocs]);
      setNewFact('');
    }
    setIsAddingFact(false);
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
        {(['identity', 'knowledge', 'training'] as const).map(tab => (
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
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

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
              <button className="glow-btn" style={{ padding: '0 24px', background: '#3b82f6', color: '#fff' }}>MAGIC SYNC</button>
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
                  <button style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => deleteKnowledgeFact(doc.id)}>✕</button>
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
                      <input placeholder="Answer this question..." style={INPUT_STYLE} />
                      <button className="glow-btn" style={{ padding: '0 20px', fontSize: '12px' }}>REPLY & TRAIN</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

    </main>
  );
}
