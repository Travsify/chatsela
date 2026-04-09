import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('industry').eq('id', user.id).single();
  const industry = profile?.industry || 'retail';

  return (
    <div className="p-8">
      <div className="glass p-12 rounded-[32px] border border-white/5 bg-white/5">
        <h1 className="text-4xl font-black mb-4 tracking-tighter">
          {industry === 'healthcare' ? '🏥 Medical Services' : '💼 Business Services'}
        </h1>
        <p className="text-white/40 mb-12 max-w-xl">
          Manage the services your AI assistant can offer and book for customers.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-all cursor-pointer group">
             <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">➕</div>
             <h3 className="font-bold text-xl mb-2">New Service</h3>
             <p className="text-sm text-white/30">Add a new service for your bot to understand and sell.</p>
          </div>
          
          <div className="glass p-8 rounded-2xl border border-white/5 opacity-50">
             <div className="text-3xl mb-4">⚙️</div>
             <h3 className="font-bold text-xl mb-2">Service Logic</h3>
             <p className="text-sm text-white/30">Configure automated booking rules and pricing.</p>
          </div>
        </div>

        <div className="mt-12 p-8 border border-dashed border-white/10 rounded-2xl text-center">
          <p className="text-white/20 italic">No services registered yet. Start by adding your primary offer.</p>
        </div>
      </div>
    </div>
  );
}
