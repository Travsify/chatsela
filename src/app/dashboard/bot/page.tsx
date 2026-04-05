'use client';

import React, { useState, useEffect, useRef } from 'react';
import { generateBotConfig, getBotSettings, saveBotSettings, SequenceFlow } from './actions';

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

  const [options, setOptions] = useState({ closeDeals: true, autoPayment: false, bookMeetings: false, afterHours: true });

  const [saved, setSaved]       = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [magicInput, setMagicInput]   = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<{
    industry?: string; brandName?: string; scrapedMenu?: boolean;
  } | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load saved bot on mount
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
    })();
  }, []);

  // ── Magic Setup ─────────────────────────────────────────────────────────────
  const handleMagicSetup = async () => {
    const trimmed = magicInput.trim();
    if (!trimmed) { inputRef.current?.focus(); return; }

    setIsGenerating(true);
    setGenError(null);
    setGenerationResult(null);

    try {
      const result = await generateBotConfig(trimmed);
      if (result.success) {
        setBotName(result.botName!);
        setPrompt(result.prompt!);
        setWelcomeMessage(result.welcomeMessage!);
        setMenuOptions(result.menuOptions!);
        setSequences(result.sequences || []);
        setGenerationResult({
          industry: result.industry,
          brandName: result.brandName,
        });
      } else {
        setGenError('Could not generate a config. Try a different URL or write a short description.');
      }
    } catch {
      setGenError('Something went wrong. Please try again.');
    }
    setIsGenerating(false);
  };

  // ── Save ────────────────────────────────────────────────────────────────────
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

  // ── Menu helpers ────────────────────────────────────────────────────────────
  const addMenuOption = () => {
    if (menuOptions.length >= 7) return;
    setMenuOptions([...menuOptions, '']);
  };
  const updateMenuOption = (i: number, val: string) => {
    const next = [...menuOptions]; next[i] = val; setMenuOptions(next);
  };
  const deleteMenuOption = (i: number) => setMenuOptions(menuOptions.filter((_, idx) => idx !== i));

  const industryLabel: Record<string, string> = {
    fashion: '👗 Fashion', restaurant: '🍔 Food & Restaurant', tech: '💻 Tech / SaaS',
    realestate: '🏡 Real Estate', fitness: '💪 Fitness', health: '🏥 Health',
    logistics: '🚚 Logistics', agency: '💼 Agency', education: '🎓 Education',
    hospitality: '🏨 Hospitality', beauty: '💅 Beauty', legal: '⚖️ Legal', generic: '🏪 General Business',
  };

  return (
    <div style={{ display: 'flex', width: '100%', gap: '30px' }}>

      {/* ── Main Column ─────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, paddingTop: '40px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

        <header>
          <h1 style={{ fontSize: '28px', marginBottom: '6px' }}>🤖 My Sales Assistant</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Configure your AI sales bot — name, personality, and the menu your customers see on WhatsApp.</p>
        </header>

        {/* ── Step 1: Magic Setup ─────────────────────────────────────────── */}
        <section className="glass" style={{
          padding: '28px', borderRadius: '24px',
          border: generationResult ? '1px solid rgba(0,255,136,0.3)' : '1px solid rgba(255,255,255,0.08)',
          background: generationResult ? 'linear-gradient(135deg,rgba(0,255,136,0.04),transparent)' : undefined,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '20px' }}>✨</span>
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Auto-Generate from URL or Description</h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px', lineHeight: '1.6' }}>
            Paste your website URL <em>or</em> describe your business in plain English — we'll detect your industry and build the perfect menu **and sequences** automatically.
          </p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              ref={inputRef}
              type="text"
              value={magicInput}
              onChange={(e) => setMagicInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleMagicSetup()}
              placeholder="e.g.  shoprite.com  OR  I sell handmade shoes in Lagos…"
              style={{ ...INPUT_STYLE, flex: '1 1 260px' }}
            />
            <button
              onClick={handleMagicSetup}
              disabled={isGenerating || !magicInput.trim()}
              style={{
                background: isGenerating || !magicInput.trim() ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#00ff88,#00d4ff)',
                color: isGenerating || !magicInput.trim() ? 'rgba(255,255,255,0.4)' : '#000',
                border: 'none', padding: '12px 28px', borderRadius: '12px',
                fontWeight: 700, fontSize: '14px',
                cursor: isGenerating || !magicInput.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              {isGenerating ? '⏳ Generating…' : '✨ Generate Bot'}
            </button>
          </div>

          {isGenerating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00ff88', animation: 'pulse 1s infinite' }} />
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Fetching your site and detecting your industry…
              </span>
            </div>
          )}

          {generationResult && !isGenerating && (
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(0,255,136,0.12)', border: '1px solid rgba(0,255,136,0.25)', color: '#00ff88', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                ✓ Generated
              </span>
              {generationResult.brandName && (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Brand: <strong style={{ color: '#fff' }}>{generationResult.brandName}</strong>
                </span>
              )}
              {generationResult.industry && (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Industry: <strong style={{ color: '#fff' }}>{industryLabel[generationResult.industry] || generationResult.industry}</strong>
                </span>
              )}
              {sequences.length > 0 && (
                <span style={{ fontSize: '13px', color: 'var(--accent-primary)' }}>
                  + <strong>{sequences.length}</strong> Automated Sequences created!
                </span>
              )}
            </div>
          )}

          {genError && (
            <p style={{ marginTop: '12px', fontSize: '13px', color: '#ff6b6b' }}>⚠️ {genError}</p>
          )}
        </section>

        {/* ── Step 2: Identity ────────────────────────────────────────────── */}
        <section className="glass" style={{ padding: '28px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 700 }}>🪪 Bot Identity & Personality</h3>

          <Field label="Bot Name">
            <input
              type="text"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              placeholder="e.g. Zara, ShopBot, Support Bot…"
              style={INPUT_STYLE}
            />
          </Field>

          <Field label="Sales Script (System Prompt)">
            <textarea
              rows={6}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your business, products, and how the bot should respond to customers…"
              style={{ ...INPUT_STYLE, resize: 'vertical', lineHeight: '1.7' }}
            />
          </Field>
        </section>

        {/* ── Step 3: WhatsApp Menu ───────────────────────────────────────── */}
        <section className="glass" style={{ padding: '28px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '4px' }}>📲 WhatsApp Interactive Menu</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>The first message every customer sees. Add up to 7 options.</p>
          </div>

          <Field label="Welcome Message">
            <input
              type="text"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              style={INPUT_STYLE}
            />
          </Field>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Menu Buttons ({menuOptions.length}/7)
            </label>

            {menuOptions.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px', minWidth: '20px', textAlign: 'right' }}>{i + 1}.</span>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateMenuOption(i, e.target.value)}
                  placeholder={`Menu option ${i + 1}`}
                  style={{ ...INPUT_STYLE, flex: 1 }}
                />
                <button
                  onClick={() => deleteMenuOption(i)}
                  title="Remove"
                  style={{
                    background: 'rgba(255,60,60,0.08)', color: '#ff6b6b',
                    border: '1px solid rgba(255,60,60,0.15)', borderRadius: '10px',
                    width: '36px', height: '36px', flexShrink: 0,
                    cursor: 'pointer', fontSize: '14px', transition: '0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >✕</button>
              </div>
            ))}

            {menuOptions.length < 7 && (
              <button
                onClick={addMenuOption}
                style={{
                  background: 'transparent', color: 'var(--accent-primary)',
                  border: '1px dashed rgba(0,255,136,0.3)', padding: '10px',
                  borderRadius: '12px', cursor: 'pointer', fontWeight: 600,
                  fontSize: '13px', transition: 'all 0.2s', marginTop: '4px',
                }}
              >
                + Add Menu Option
              </button>
            )}
          </div>
        </section>

        {/* ── Step 4: Automated Sequences ─────────────────────────────────── */}
        {sequences.length > 0 && (
          <section className="glass" style={{ padding: '28px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <span style={{ fontSize: '18px' }}>🤖</span>
                <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Automated Flow Sequences</h3>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>The bot will automatically ask these questions when a user selects corresponding menu items.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {sequences.map((seq, i) => (
                <div key={i} className="glass" style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)' }} />
                    {seq.intent} Sequence
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {seq.steps.map((step, si) => (
                      <div key={si} style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', paddingTop: '4px' }}>
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>{si + 1}</div>
                          {si < seq.steps.length - 1 && <div style={{ width: '1px', height: '100%', background: 'rgba(255,255,255,0.08)' }} />}
                        </div>
                        <div style={{ flex: 1, paddingBottom: '8px' }}>
                          <div style={{ fontSize: '13px', color: '#fff', marginBottom: '4px' }}>{step.prompt}</div>
                          {step.save_to && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Saves to: <code style={{ color: 'rgba(255,255,255,0.5)' }}>{step.save_to}</code></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Note: These sequences are automatically prioritized by the AI Engine to ensure high-accuracy responses.</p>
          </section>
        )}

        {/* ── Step 5: Behaviour toggles ───────────────────────────────────── */}
        <section className="glass" style={{ padding: '28px', borderRadius: '24px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '20px' }}>⚙️ Sales Behaviour</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {[
              { key: 'closeDeals',   icon: '🎯', title: 'Close Deals Mode',       desc: 'Focuses every chat on booking or sending a payment link.' },
              { key: 'autoPayment',  icon: '💳', title: 'Auto-Send Payment Link', desc: 'Automatically sends a checkout link when a customer is ready to buy.' },
              { key: 'bookMeetings', icon: '📅', title: 'Book Meetings',          desc: 'Prompts interested customers to schedule a call.' },
              { key: 'afterHours',   icon: '🌙', title: 'After-Hours Reply',      desc: 'Keeps your bot active 24/7, even while you sleep.' },
            ].map(({ key, icon, title, desc }) => (
              <div key={key} className="glass" style={{ padding: '20px', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '15px' }}>{icon} {title}</h4>
                  <Toggle
                    on={options[key as keyof typeof options]}
                    onChange={() => setOptions((p) => ({ ...p, [key]: !p[key as keyof typeof options] }))}
                  />
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Save bar ────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingBottom: '40px' }}>
          <button
            className="glow-btn"
            style={{ padding: '14px 36px', opacity: isSaving ? 0.7 : 1, fontSize: '15px' }}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? '⏳ Saving…' : saved ? '✅ Saved!' : '💾 Save Bot Settings'}
          </button>
          {saveError && <p style={{ fontSize: '13px', color: '#ff6b6b' }}>⚠️ {saveError}</p>}
        </div>
      </main>

      {/* ── WhatsApp Preview Sidebar ───────────────────────────────────────── */}
      <aside style={{ width: '340px', flexShrink: 0, paddingTop: '40px' }}>
        <div style={{ position: 'sticky', top: '20px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', textAlign: 'center' }}>Live Preview</p>

          <div style={{
            background: '#0b141a', borderRadius: '28px', padding: '16px',
            border: '6px solid #1e2a30', display: 'flex', flexDirection: 'column',
            maxHeight: '78vh', overflow: 'hidden',
          }}>
            {/* Phone header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '12px' }}>
              <div style={{ width: '38px', height: '38px', background: '#00a884', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '16px' }}>
                {botName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{botName}</div>
                <div style={{ fontSize: '11px', color: '#8696a0' }}>Online · bot</div>
              </div>
            </div>

            {/* Chat body */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '10px', textAlign: 'center', color: '#8696a0' }}>TODAY</p>

              {/* Bot welcome */}
              <div style={{ background: '#202c33', padding: '10px 12px', borderRadius: '0 12px 12px 12px', fontSize: '13px', lineHeight: '1.5', maxWidth: '90%', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {welcomeMessage}
              </div>

              {/* Menu options */}
              {menuOptions.filter(Boolean).map((opt, i) => (
                <div key={i} style={{ background: '#1d282e', border: '1px solid rgba(0,168,132,0.2)', padding: '8px 12px', borderRadius: '8px', textAlign: 'center', color: '#00a884', fontWeight: 500, fontSize: '13px', cursor: 'pointer' }}>
                  {i + 1}️⃣ {opt}
                </div>
              ))}

              {/* Sequence Demo Message */}
              {sequences.length > 0 && (
                <div style={{ background: '#202c33', padding: '8px 12px', borderRadius: '12px 12px 12px 0', fontSize: '12px', color: '#8696a0', marginTop: '12px', borderLeft: '3px solid var(--accent-primary)' }}>
                  ℹ️ Selecting an option above will trigger its automated sequence.
                </div>
              )}
            </div>

            {/* Input bar */}
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', background: '#202c33', padding: '8px 12px', borderRadius: '24px' }}>
              <span style={{ fontSize: '18px' }}>🙂</span>
              <span style={{ flex: 1, color: '#8696a0', fontSize: '13px' }}>Message</span>
              <span style={{ fontSize: '18px' }}>🎤</span>
            </div>
          </div>
        </div>
      </aside>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        input:focus, textarea:focus { border-color: rgba(0,255,136,0.4) !important; }
      `}</style>
    </div>
  );
}
