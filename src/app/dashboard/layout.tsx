import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch profile to pass props to Sidebar
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_name, billing_tier')
    .eq('id', user.id)
    .single();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: 'var(--bg-dark)', color: '#fff' }}>
      <Sidebar 
        businessName={profile?.business_name || user.email?.split('@')[0]} 
        billingTier={profile?.billing_tier} 
      />
      <div style={{ flex: 1, display: 'flex', gap: '30px', padding: '40px 40px 40px 0', overflowY: 'auto', height: '100vh' }}>
        {children}
      </div>
    </div>
  );
}
