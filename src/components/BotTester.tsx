'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function BotTester() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg: Message = { role: 'user', content: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      // 🧠 We use the verified 'testIntelligence' action from bot/actions
      const { testIntelligence } = await import('@/app/dashboard/bot/actions');
      const res = await testIntelligence(inputText);
      
      const botMsg: Message = { 
        role: 'assistant', 
        content: res.answer || 'I encountered an error processing that.' 
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ System Error: Connection lost.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="glass" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '500px', 
      borderRadius: '24px', 
      background: 'rgba(255,255,255,0.02)', 
      border: '1px solid rgba(255,255,255,0.05)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 10px #00ff88' }} />
          <h4 style={{ fontSize: '14px', fontWeight: 700 }}>AI Sandbox (Verified Preview)</h4>
        </div>
        <button 
          onClick={() => setMessages([])}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Clear Chat
        </button>
      </div>

      {/* Message Feed */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>
             Start a conversation to see your AI in action.<br/>
             <span style={{ fontSize: '11px' }}>Verify your website data and prices here.</span>
          </div>
        )}
        {messages.map((m, i) => (
          <div 
            key={i} 
            style={{ 
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '12px 16px',
              borderRadius: '16px',
              background: m.role === 'user' ? '#0070f3' : 'rgba(255,255,255,0.05)',
              color: '#fff',
              fontSize: '14px',
              lineHeight: '1.5',
              border: m.role === 'assistant' ? '1px solid rgba(255,255,255,0.05)' : 'none'
            }}
          >
            {m.content}
          </div>
        ))}
        {isTyping && (
          <div style={{ alignSelf: 'flex-start', padding: '12px 16px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.4)', fontSize: '12px', display: 'flex', gap: '4px' }}>
            <span className="dot-blink">.</span><span className="dot-blink">.</span><span className="dot-blink">.</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '10px' }}>
        <input 
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type a message to test your AI..." 
          style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '12px', color: '#fff', outline: 'none', fontSize: '14px' }}
        />
        <button 
          onClick={handleSend}
          disabled={!inputText.trim() || isTyping}
          style={{ 
            background: '#fff', 
            color: '#000', 
            border: 'none', 
            padding: '0 20px', 
            borderRadius: '12px', 
            fontWeight: 800, 
            cursor: 'pointer',
            opacity: !inputText.trim() || isTyping ? 0.3 : 1
          }}
        >
          {isTyping ? '⌛' : 'SEND'}
        </button>
      </div>

      <style>{`
        .dot-blink { animation: blink 1.4s infinite both; }
        .dot-blink:nth-child(2) { animation-delay: .2s; }
        .dot-blink:nth-child(3) { animation-delay: .4s; }
        @keyframes blink { 0% { opacity: .2; } 20% { opacity: 1; } 100% { opacity: .2; } }
      `}</style>
    </div>
  );
}
