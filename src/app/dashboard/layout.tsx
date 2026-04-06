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

  const { data: bot } = await supabase
    .from('bots')
    .select('status')
    .eq('user_id', user.id)
    .single();

  return (
    <div className="dashboard-container">
      <Sidebar 
        businessName={profile?.business_name || user.email?.split('@')[0]} 
        billingTier={profile?.billing_tier} 
        isBotActive={bot?.status === 'active'}
      />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
