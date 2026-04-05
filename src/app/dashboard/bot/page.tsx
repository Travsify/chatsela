'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  generateBotConfig, 
  getBotSettings, 
  saveBotSettings, 
  SequenceFlow,
  getKnowledgeBaseDocs,
  addKnowledgeFact,
  deleteKnowledgeFact
} from './actions';

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      role="switch"
      aria-checked={on}
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

// ── Inline field ──────────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: '12px', color: 'var(--accent-primary)' }}>{hint}</p>}
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
  transition: 'border-color 0.2s',
};

export default function BotConfigPage() {
  const [botName, setBotName]             = useState('My Sales Assistant');
  const [prompt, setPrompt]               = useState('You are a professional sales assistant. Be helpful, friendly, and guide customers to make a purchase or book a consultation.');
  const [welcomeMessage, setWelcomeMessage] = useState('Hello! 👋 How can I help you today?');
  const [menuOptions, setMenuOptions]     = useState<string[]>(['📦 Our Products & Services', '💰 Pricing', '❓ FAQs', '👤 Talk to a Human']);
  const [sequences, setSequences]         = useState<SequenceFlow[]>([]);
  const [options, setOptions]             = useState({ closeDeals: true, autoPayment: false, bookMeetings: false, afterHours: true });

  const [kbDocs, setKbDocs]       = useState<any[]>([]);
  const [newFact, setNewFact]     = useState('');
  const [isAddingFact, setIsAddingFact] = useState(false);

  const [saved, setSaved]       = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [magicInput, setMagicInput]   = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<{
    industry?: string; brandName?: string;
  } | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load saved bot and KB on mount
  useEffect(() => {
    (async () => {
      const result = await getBotSettings();
      if (result.success && result.bot) {
        if (result.bot.name)            setBotName(result.bot.name);
        if (result.bot.prompt)          setPrompt(result.bot.prompt);
        if (result.bot.welcome_message) setWelcomeMessage(result.bot.welcome_message);
        if (result.bot.menu_options?.length) setMenuOptions(result.bot.menu_options);
        if (result.bot.sequences)       setSequences(result.bot.sequences);
      }

      const kb = await getKnowledgeBaseDocs();
      if (kb.success) setKbDocs(kb.documents || []);
    })();
  }, []);

  // Magic Setup
  const handleMagicSetup = async () => {
    const trimmed = magicInput.trim();
    if (!trimmed) { inputRef.current?.focus(); return; }
    setIsGenerating(true);
    setGenError(null);
    try {
      const result = await generateBotConfig(trimmed);
      if (result.success) {
        setBotName(result.botName!);
        setPrompt(result.prompt!);
        setWelcomeMessage(result.welcomeMessage!);
        setMenuOptions(result.menuOptions!);
        setSequences(result.sequences || []);
        setGenerationResult({ industry: result.industry, brandName: result.brandName });
      } else {
        setGenError('Could not generate a config. Try a different URL or write a short description.');
      }
    } catch {
      setGenError('Something went wrong. Please try again.');
    }
    setIsGenerating(false);
  };

  // Save Settings
  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    const result = await saveBotSettings(botName, prompt, welcomeMessage, menuOptions, sequences);
    setIsSaving(false);
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setSaveError(result.error || 'Save failed.');
    }
  };

  // Knowledge Base Actions
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
    const res = await deleteKnowledgeFact(id);
    if (res.success) setKbDocs(kbDocs.filter(d => d.id !== id));
  };

  // Menu helpers
  const addMenuOption = () => menuOptions.length < 7 && setMenuOptions([...menuOptions, '']);
  const updateMenuOption = (i: number, val: string) => { const next = [...menuOptions]; next[i] = val; setMenuOptions(next); };
  const deleteMenuOption = (i: number) => setMenuOptions(menuOptions.filter((_, idx) => idx !== i));

  return (
    <div style={{ display: 'flex', width: '100%', gap: '30px' }}>
      <main style={{ flex: 1, paddingTop: '40px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <header>
          <h1 style={{ fontSize: '28px', marginBottom: '6px' }}>🤖 My Sales Assistant</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Configure your AI sales bot — name, personality, and the menu your customers see on WhatsApp.</p>
        </header>

        {/* Step 1: Magic Setup */}
        <section className="glass" style={{ padding: '28px', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <span style={{ fontSize: '20px' }}>✨</span>
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Auto-Generate from URL</h3>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              ref={inputRef}
              type="text"
              value={magicInput}
              onChange={(e) => setMagicInput(e.target.value)}
              placeholder="e.g. shoprite.com"
              style={INPUT_STYLE}
            />
            <button onClick={handleMagicSetup} disabled={isGenerating} style={{ background: 'linear-gradient(135deg,#00ff88,#00d4ff)', color: '#000', border: 'none', padding: '12px 28px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
              {isGenerating ? '⌛' : 'Generate'}
            </button>
          </div>
        </section>

        {/* Step 2: Knowledge Vault */}
        <section className="glass" style={{ padding: '28px', borderRadius: '24px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '18px' }}>🧠</span>
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>The Knowledge Vault</h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>What facts should Claude know about your business?</p>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input type="text" value={newFact} onChange={(e) => setNewFact(e.target.value)} placeholder="Add a business fact..." style={INPUT_STYLE} />
            <button onClick={handleAddFact} disabled={isAddingFact} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
               {isAddingFact ? '...' : 'Add'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
            {kbDocs.map(doc => (
              <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '13px', color: '#e2e8f0', flex: 1, marginRight: '10px' }}>{doc.content}</p>
                <button onClick={() => handleDeleteFact(doc.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px' }}>✕</button>
              </div>
            ))}
          </div>
        </section>

        {/* Step 3: Identity & Menu */}
        <section className="glass" style={{ padding: '28px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 700 }}>🪪 Bot Identity</h3>
          <Field label="Bot Name"><input type="text" value={botName} onChange={(e) => setBotName(e.target.value)} style={INPUT_STYLE} /></Field>
          <Field label="Sales Prompt"><textarea rows={6} value={prompt} onChange={(e) => setPrompt(e.target.value)} style={{ ...INPUT_STYLE, resize: 'vertical' }} /></Field>
        </section>

        {/* Step 4: WhatsApp Menu */}
        <section className="glass" style={{ padding: '28px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
           <h3 style={{ fontSize: '17px', fontWeight: 700 }}>📲 Interactive Menu</h3>
           <Field label="Welcome Message"><input type="text" value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} style={INPUT_STYLE} /></Field>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
             {menuOptions.map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px' }}>
                  <input type="text" value={opt} onChange={(e) => updateMenuOption(i, e.target.value)} style={{ ...INPUT_STYLE, flex: 1 }} />
                  <button onClick={() => deleteMenuOption(i)} style={{ padding: '0 12px', color: '#ff6b6b', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                </div>
             ))}
             {menuOptions.length < 7 && <button onClick={addMenuOption} style={{ color: 'var(--accent-primary)', background: 'none', border: '1px dashed rgba(0,255,136,0.2)', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}>+ Add Option</button>}
           </div>
        </section>

        <section className="glass" style={{ padding: '28px', borderRadius: '24px' }}>
           <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '20px' }}>⚙️ Sales Behaviour</h3>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
             {[
               { key: 'closeDeals', icon: '🎯', title: 'Close Deals' },
               { key: 'autoPayment', icon: '💳', title: 'Auto-Payment' },
               { key: 'bookMeetings', icon: '📅', title: 'Book Meetings' },
               { key: 'afterHours', icon: '🌙', title: '24/7 Mode' },
             ].map(({ key, icon, title }) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '14px' }}>{icon} {title}</span>
                  <Toggle on={(options as any)[key]} onChange={() => setOptions((p: any) => ({ ...p, [key]: !p[key] }))} />
                </div>
             ))}
           </div>
        </section>

        <button className="glow-btn" style={{ padding: '14px 36px', width: 'fit-content' }} onClick={handleSave} disabled={isSaving}>
           {isSaving ? '⏳ Saving...' : saved ? '✅ Saved!' : '💾 Save Settings'}
        </button>
      </main>

      <aside style={{ width: '340px', flexShrink: 0, paddingTop: '40px' }}>
        <div style={{ position: 'sticky', top: '20px', background: '#0b141a', borderRadius: '28px', padding: '16px', border: '6px solid #1e2a30' }}>
           <p style={{ textAlign: 'center', fontSize: '11px', color: '#8696a0', marginBottom: '12px' }}>WhatsApp Preview</p>
           <div style={{ borderBottom: '1px solid #1e2a30', paddingBottom: '12px', marginBottom: '12px', display: 'flex', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#00a884' }} />
              <div><p style={{ fontSize: '14px', fontWeight: '600' }}>{botName}</p><p style={{ fontSize: '10px', color: '#8696a0' }}>Online</p></div>
           </div>
           <div style={{ background: '#202c33', padding: '10px', borderRadius: '0 12px 12px 12px', fontSize: '13px', marginBottom: '10px' }}>{welcomeMessage}</div>
           {menuOptions.map((o, i) => o && <div key={i} style={{ padding: '8px', background: '#1d282e', color: '#00a884', borderRadius: '8px', textAlign: 'center', fontSize: '12px', marginBottom: '6px', border: '1px solid #00a88433' }}>{o}</div>)}
        </div>
      </aside>
    </div>
  );
}
