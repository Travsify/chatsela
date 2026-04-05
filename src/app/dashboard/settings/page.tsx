import React from 'react';
import { createClient } from '@/utils/supabase/server';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>⚙️ Settings</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Manage your account, billing, and system preferences.</p>
        </div>
      </header>

      <div className="glass" style={{ padding: '40px', borderRadius: '24px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Account Details</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>Email: {user?.email}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>User ID: {user?.id}</p>
        <button style={{ background: 'var(--grad-primary)', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 600 }}>Edit Profile</button>
      </div>
    </main>
  );
}
