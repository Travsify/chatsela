import React from 'react';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';

export default async function LeadsPage() {
  const supabase = await createClient();
  
  // Fetch active leads with insights
  const { data: leads, error } = await supabase
    .from('chat_insights')
    .select('*')
    .order('last_interaction_at', { ascending: false });

  const totalValue = leads?.reduce((acc, lead) => acc + (Number(lead.value_estimate) || 0), 0) || 0;

  return (
    <main style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-0.02em' }}>
            🔥 Sales Intelligence
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
            **ChatSela Engine** is analyzing your conversations in real-time to find high-value opportunities.
          </p>
        </div>
        
        <div className="glass" style={{ padding: '20px 30px', borderRadius: '20px', textAlign: 'right', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Potential Pipeline Value
          </p>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#10b981' }}>
            ${totalValue.toLocaleString()}
          </h2>
        </div>
      </header>

      {!leads || leads.length === 0 ? (
        <div className="glass" style={{ padding: '80px 40px', borderRadius: '32px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px', filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.2))' }}>💬</div>
          <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px' }}>Waiting for the first lead...</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '400px', margin: '0 auto 32px' }}>
            When a customer messages your WhatsApp bot, our AI will analyze the intent and display the lead here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '24px' }}>
          {leads.map((lead) => (
            <div key={lead.id} className="glass" style={{ 
              padding: '24px', 
              borderRadius: '24px', 
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              cursor: 'default'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>{lead.customer_phone}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Last active {new Date(lead.last_interaction_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div style={{ 
                  padding: '6px 12px', 
                  borderRadius: '12px', 
                  fontSize: '12px', 
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  backgroundColor: lead.sentiment === 'positive' ? 'rgba(16, 185, 129, 0.1)' : lead.sentiment === 'negative' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  color: lead.sentiment === 'positive' ? '#10b981' : lead.sentiment === 'negative' ? '#ef4444' : 'var(--text-muted)',
                  border: `1px solid ${lead.sentiment === 'positive' ? 'rgba(16, 185, 129, 0.2)' : lead.sentiment === 'negative' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)'}`
                }}>
                  {lead.sentiment === 'positive' ? '🔥 Hot Lead' : lead.sentiment === 'negative' ? '⚠️ At Risk' : '❄️ Warm'}
                </div>
              </div>

              <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#e2e8f0' }}>
                  "{lead.summary}"
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, padding: '12px', borderRadius: '16px', backgroundColor: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                  <p style={{ fontSize: '10px', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '4px', fontWeight: '700' }}>Intent</p>
                  <p style={{ fontSize: '14px', fontWeight: '600' }}>{lead.intent.charAt(0).toUpperCase() + lead.intent.slice(1)}</p>
                </div>
                <div style={{ flex: 1, padding: '12px', borderRadius: '16px', backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                  <p style={{ fontSize: '10px', textTransform: 'uppercase', color: '#10b981', marginBottom: '4px', fontWeight: '700' }}>Potential</p>
                  <p style={{ fontSize: '14px', fontWeight: '600' }}>${Number(lead.value_estimate).toLocaleString()}</p>
                </div>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>🚀 Recommendation</p>
                <p style={{ fontSize: '13px', fontStyle: 'italic', color: '#94a3b8' }}>
                  {lead.next_steps}
                </p>
              </div>

              <Link href={`/dashboard/chat?phone=${lead.customer_phone}`} style={{
                marginTop: '10px',
                padding: '12px',
                borderRadius: '14px',
                backgroundColor: 'var(--foreground)',
                color: 'var(--background)',
                textAlign: 'center',
                fontSize: '14px',
                fontWeight: '700',
                textDecoration: 'none'
              }}>
                Open Conversation
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
