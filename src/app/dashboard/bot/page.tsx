'use client';

import React, { useState, useEffect } from 'react';
import { getBotSettings, saveBotSettings } from './actions';

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

const commonSectionStyle: React.CSSProperties = { padding: '28px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' };

export default function BotConfigPage() {
  const [botName, setBotName] = useState('My Sales Assistant');
  const [prompt, setPrompt] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('Hello! 👋 How can I help you today?');
  const [menuOptions, setMenuOptions] = useState<string[]>(['📦 Our Products & Services', '📅 Book Appointment', '💬 Contact Us']);
  
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const bot = await getBotSettings();
      if (bot.success && bot.bot) {
        setBotName(bot.bot.name || '');
        setPrompt(bot.bot.prompt || '');
        setWelcomeMessage(bot.bot.welcome_message || '');
        setMenuOptions(bot.bot.menu_options || []);
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

  return (
    <div style={{ display: 'flex', width: '100%', gap: '30px', paddingBottom: '80px' }}>
      <main style={{ flex: 1, paddingTop: '40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        <header>
          <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', background: 'linear-gradient(135deg,#fff,#888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🤖 Bot Identity
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>Define the core personality and initial greeting for your autonomous sales engine.</p>
        </header>

        <section style={commonSectionStyle}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>🪪 Core Configuration</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px' }}>Assistant Name</label>
              <input type="text" value={botName} onChange={(e) => setBotName(e.target.value)} style={INPUT_STYLE} />
            </div>
            
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px' }}>First Message (Icebreaker)</label>
              <input type="text" value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} style={INPUT_STYLE} />
            </div>
            
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px' }}>WhatsApp Interactive Menu Options (Comma separated)</label>
              <input 
                type="text" 
                value={menuOptions.join(', ')} 
                onChange={(e) => setMenuOptions(e.target.value.split(',').map(s => s.trim()).filter(Boolean))} 
                style={INPUT_STYLE} 
                placeholder="e.g. Products, Appointment, Contact"
              />
            </div>
            
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px' }}>Sales Protocol (The Core Brain/Prompt)</label>
              <textarea rows={10} value={prompt} onChange={(e) => setPrompt(e.target.value)} style={{ ...INPUT_STYLE, resize: 'vertical' }} />
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>To teach your bot specific facts or pricing, go to the <b>🎓 Train Your Bot</b> tab.</p>
            </div>
          </div>
        </section>

        <button className="glow-btn" style={{ padding: '16px 40px', width: 'fit-content' }} onClick={handleSaveAll} disabled={isSaving}>
          {isSaving ? '⌛ Saving Identity...' : saved ? '✅ Identity Saved' : '💾 Save Identity'}
        </button>
      </main>
    </div>
  );
}
