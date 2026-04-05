import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import DeveloperApiManager from './DeveloperApiManager';

export default async function DeveloperPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile to get existing API key and metadata
  const { data: profile } = await supabase
    .from('profiles')
    .select('api_key, api_key_created_at, business_name')
    .eq('id', user.id)
    .single()

  // Fetch message count for API usage context
  const { count: messageCount } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return (
    <>
      {/* Main Content */}
      <main style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        <header>
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>💻 Developer API</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Generate your secret API key to integrate ChatSela with your CRM, website, or custom applications.</p>
        </header>

        <DeveloperApiManager 
          initialApiKey={profile?.api_key || null}
          initialCreatedAt={profile?.api_key_created_at || null}
          businessName={profile?.business_name || user.email?.split('@')[0] || 'My Business'}
          totalMessages={messageCount || 0}
        />

      </main>
    </>
  );
}
