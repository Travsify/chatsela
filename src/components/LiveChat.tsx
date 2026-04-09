'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getWhatsAppContacts, getChatHistory, sendWhatsAppMessage, toggleChatBot } from '@/app/dashboard/actions';

interface Contact {
  id: string;
  name: string;
  pushname: string;
  type: string;
}

interface Message {
  id: string;
  from: string;
  from_me: boolean;
  text: { body: string };
  timestamp: number;
}

export default function LiveChat({ industry }: { industry: string }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [botStatuses, setBotStatuses] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const getLabel = () => {
    switch (industry) {
      case 'healthcare': return 'Patient';
      case 'real_estate': return 'HomeSeeker';
      case 'hospitality': return 'Guest';
      case 'automotive': return 'Buyer';
      case 'logistics': return 'Shipper';
      default: return 'Customer';
    }
  };

  useEffect(() => {
    fetchContacts();
    const interval = setInterval(fetchContacts, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedContact) {
      fetchHistory(selectedContact.id);
      const interval = setInterval(() => fetchHistory(selectedContact.id), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedContact]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchContacts = async () => {
    const res = await getWhatsAppContacts();
    if (res.success) {
      setContacts(res.contacts);
      const statuses: Record<string, boolean> = {};
      res.botStatuses.forEach((s: any) => {
        statuses[s.customer_phone] = s.is_bot_active;
      });
      setBotStatuses(statuses);
    }
    setLoading(false);
  };

  const fetchHistory = async (id: string) => {
    const res = await getChatHistory(id);
    if (res.success) setMessages(res.messages);
  };

  const handleSend = async () => {
    if (!selectedContact || !inputText.trim()) return;
    setSending(true);
    const res = await sendWhatsAppMessage(selectedContact.id, inputText);
    if (res.success) {
      setInputText('');
      fetchHistory(selectedContact.id);
    } else {
      alert(`Error: ${res.error}`);
    }
    setSending(false);
  };

  const handoffToggle = async (contactId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const res = await toggleChatBot(contactId, newStatus);
    if (res.success) {
      setBotStatuses({ ...botStatuses, [contactId]: newStatus });
    }
  };

  return (
    <div style={{ display: 'flex', height: '600px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
      
      {/* ── Sidebar: Contact List ── */}
      <div style={{ width: '300px', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700 }}>📱 Live {getLabel()}s</h4>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {contacts.map(c => (
            <div 
              key={c.id} 
              onClick={() => setSelectedContact(c)}
              style={{ 
                padding: '16px 20px', 
                cursor: 'pointer', 
                background: selectedContact?.id === c.id ? 'rgba(0,255,136,0.05)' : 'transparent',
                borderBottom: '1px solid rgba(255,255,255,0.02)',
                position: 'relative'
              }}
            >
              <p style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>{c.name || c.id.split('@')[0]}</p>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{getLabel()}</span>
              {botStatuses[c.id] === false && (
                <span style={{ position: 'absolute', top: '16px', right: '20px', fontSize: '10px', color: '#ff4b2b', background: 'rgba(255,75,43,0.1)', padding: '2px 6px', borderRadius: '4px' }}>Human Mode</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Main: Message Thread ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)' }}>
        {selectedContact ? (
          <>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 700 }}>{selectedContact.name}</h4>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{selectedContact.id}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>🤖 AI Bot:</span>
                <button 
                  onClick={() => handoffToggle(selectedContact.id, botStatuses[selectedContact.id] ?? true)}
                  style={{ 
                    padding: '4px 12px', 
                    borderRadius: '20px', 
                    border: 'none', 
                    fontSize: '11px', 
                    fontWeight: 800, 
                    cursor: 'pointer',
                    background: (botStatuses[selectedContact.id] ?? true) ? '#00ff88' : '#ff4b2b',
                    color: '#000'
                  }}
                >
                  {(botStatuses[selectedContact.id] ?? true) ? 'ACTIVE' : 'PAUSED'}
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messages.map(m => (
                <div 
                  key={m.id} 
                  style={{ 
                    alignSelf: m.from_me ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    padding: '10px 16px',
                    borderRadius: '16px',
                    background: m.from_me ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                    color: m.from_me ? '#000' : '#fff',
                    fontSize: '14px',
                    position: 'relative'
                  }}
                >
                  {m.text?.body}
                  <small style={{ display: 'block', fontSize: '9px', opacity: 0.5, marginTop: '4px', textAlign: 'right' }}>
                    {new Date(m.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </small>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '10px' }}>
              <input 
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Type a message (Send as Human)..." 
                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 20px', borderRadius: '12px', color: '#fff', outline: 'none' }}
              />
              <button 
                onClick={handleSend}
                disabled={sending}
                style={{ background: 'var(--accent-primary)', color: '#000', border: 'none', padding: '0 24px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}
              >
                {sending ? '...' : 'SEND'}
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)' }}>
            Select a contact to start chatting as human.
          </div>
        )}
      </div>
    </div>
  );
}
