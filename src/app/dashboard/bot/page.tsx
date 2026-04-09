'use client';

import React, { useState, useEffect } from 'react';
import { 
  getKnowledgeBaseDocs,
  addKnowledgeFact,
  deleteKnowledgeFact,
  getBotSettings,
  saveBotSettings,
  getKnowledgeGaps,
  resolveKnowledgeGap,
  scrapeWebsiteToKnowledgeBase,
  generateWelcomeMessage,
  getMerchantIntegrations
} from './actions';
import WhatsAppConnector from '@/components/WhatsAppConnector';
import BotTester from '@/components/BotTester';
import ProductsLedger from './ProductsLedger';
import ServiceLedger from './ServiceLedger';

const INPUT_STYLE: React.CSSProperties = {
  padding: '12px 16px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  color: '#fff',
  outline: 'none',
  fontSize: '14px',
  width: '100%',
};

const commonSectionStyle: React.CSSProperties = { 
  padding: '28px', 
  borderRadius: '24px', 
  border: '1px solid rgba(255,255,255,0.05)', 
  background: 'rgba(255,255,255,0.02)' 
};

export default function IntelligenceHubPage() {
  const [botName, setBotName] = useState('My Sales Assistant');
  const [prompt, setPrompt] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('Hello! 👋 How can I help you today?');
  const [menuOptions, setMenuOptions] = useState<string[]>([]);
  const [kbDocs, setKbDocs] = useState<any[]>([]);
  const [newFact, setNewFact] = useState('');
  const [isAddingFact, setIsAddingFact] = useState(false);
  const [gaps, setGaps] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [magicInput, setMagicInput] = useState('');
  const [industry, setIndustry] = useState('retail');
  const [activeTab, setActiveTab] = useState<'identity' | 'knowledge' | 'catalog' | 'training' | 'lab' | 'whatsapp'>('identity');

  useEffect(() => {
    (async () => {
      const bot = await getBotSettings();
      if (bot.success && bot.bot) {
        setBotName(bot.bot.name || '');
        setPrompt(bot.bot.prompt || '');
        setWelcomeMessage(bot.bot.welcome_message || '');
        setMenuOptions(bot.bot.menu_options || []);
      }
      
      const merch = await getMerchantIntegrations();
      // Need industry from somewhere else? or add to integrations
      // For now we'll imply it from the persona or re-fetch profile inside a new action
      
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
    if (res.success) setKbDocs(kbDocs.filter(d => d.id !== id));
  };

  const handleResolveGap = async (gap: any, answer: string) => {
    if (!answer.trim()) return;
    const res = await resolveKnowledgeGap(gap.id, gap.question, answer, gap.customer_phone || '');
    if (res.success) {
      setGaps(gaps.filter(g => g.id !== gap.id));
      const kb = await getKnowledgeBaseDocs();
      if (kb.success) setKbDocs(kb.documents || []);
    }
  };

  return (
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '32px', padding: '40px' }}>
      <header>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', background: 'linear-gradient(135deg,#fff,#888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🧠 Intelligence Hub
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>The central nervous system for your AI Bot. Configure identity and knowledge.</p>
      </header>

      <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '16px', alignSelf: 'flex-start' }}>
        {(['whatsapp', 'identity', 'knowledge', 'catalog', 'training', 'lab'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', fontSize: '14px', fontWeight: 700, cursor: 'pointer', background: activeTab === tab ? 'var(--accent-primary)' : 'transparent', color: activeTab === tab ? '#000' : 'rgba(255,255,255,0.5)', transition: 'all 0.2s' }}>
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {activeTab === 'whatsapp' && <WhatsAppConnector />}

      {activeTab === 'identity' && (
        <section style={commonSectionStyle}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>🪪 Bot Identity</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px' }}>Assistant Name</label>
              <input type="text" value={botName} onChange={(e) => setBotName(e.target.value)} style={INPUT_STYLE} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px' }}>Welcome Message</label>
              <input type="text" value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} style={INPUT_STYLE} />
            </div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px' }}>Sales Protocol (AI Instructions)</label>
            <textarea rows={6} value={prompt} onChange={(e) => setPrompt(e.target.value)} style={{ ...INPUT_STYLE, resize: 'vertical' }} />
          </div>
          <button className="glow-btn" onClick={handleSaveAll} disabled={isSaving}>{isSaving ? '⌛ Saving...' : 'Save Changes'}</button>
        </section>
      )}

      {activeTab === 'knowledge' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ ...commonSectionStyle, borderLeft: '4px solid #3b82f6' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>🌐 Smart Website Sync</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input type="text" value={magicInput} onChange={(e) => setMagicInput(e.target.value)} placeholder="https://yourwebsite.com" style={INPUT_STYLE} />
              <button className="glow-btn" style={{ minWidth: '160px' }} disabled={isScraping} onClick={async () => {
                setIsScraping(true);
                const res = await scrapeWebsiteToKnowledgeBase(magicInput);
                setIsScraping(false);
                if (res.success) {
                   alert(`✅ Extracted everything! (including ${res.productsExtracted} items)`);
                   window.location.reload();
                }
              }}>{isScraping ? '⏳ SYNCING...' : '🚀 MAGIC SYNC'}</button>
            </div>
          </div>
          <div style={commonSectionStyle}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>📦 Knowledge Base</h3>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <input type="text" value={newFact} onChange={(e) => setNewFact(e.target.value)} placeholder="Add a specific fact manually..." style={INPUT_STYLE} />
              <button className="glow-btn" onClick={handleAddFact} disabled={isAddingFact}>ADD</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {kbDocs.map((doc: any) => (
                <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                  <p style={{ fontSize: '14px' }}>[{doc.category}] {doc.content}</p>
                  <button style={{ color: '#ef4444' }} onClick={() => handleDeleteFact(doc.id)}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'catalog' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <ServiceLedger />
          <ProductsLedger />
        </section>
      )}

      {activeTab === 'training' && (
        <section style={commonSectionStyle}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px' }}>🔔 Knowledge Gaps</h3>
          {gaps.map((gap: any) => (
            <div key={gap.id} style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', marginBottom: '16px' }}>
              <p style={{ fontWeight: 700 }}>❓ {gap.question}</p>
              <input 
                id={`gap-${gap.id}`}
                placeholder="Answer to train bot..." 
                style={{ ...INPUT_STYLE, marginTop: '12px' }} 
                onKeyDown={(e) => e.key === 'Enter' && handleResolveGap(gap, (e.target as HTMLInputElement).value)}
              />
            </div>
          ))}
        </section>
      )}

      {activeTab === 'lab' && <BotTester />}
    </main>
  );
}
