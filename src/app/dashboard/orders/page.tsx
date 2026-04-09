import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('industry').eq('id', user.id).single();
  const industry = profile?.industry || 'retail';

  const labels: Record<string, { title: string, sub: string, icon: string }> = {
    healthcare: { title: 'Appointments', sub: 'Manage patient bookings and consultations.', icon: '🩺' },
    real_estate: { title: 'Viewings', sub: 'Track scheduled property tours and appraisals.', icon: '🔑' },
    logistics: { title: 'Shipments', sub: 'Monitor active and historical cargo movements.', icon: '📦' },
    hospitality: { title: 'Reservations', sub: 'Manage table and room bookings.', icon: '🛎️' },
    retail: { title: 'Customer Orders', sub: 'Track product sales and fulfillments.', icon: '🛍️' }
  };

  const config = labels[industry] || labels.retail;

  return (
    <div className="p-8">
      <div className="glass p-12 rounded-[32px] border border-white/5 bg-white/5">
        <h1 className="text-4xl font-black mb-4 tracking-tighter flex items-center gap-4">
          <span>{config.icon}</span> {config.title}
        </h1>
        <p className="text-white/40 mb-12 max-w-xl">
          {config.sub}
        </p>

        <div className="flex gap-4 mb-8">
          <div className="glass px-6 py-2 rounded-full border border-white/10 text-xs font-bold bg-white/5">ALL</div>
          <div className="glass px-6 py-2 rounded-full border border-white/5 text-xs text-white/30">PENDING</div>
          <div className="glass px-6 py-2 rounded-full border border-white/5 text-xs text-white/30">COMPLETED</div>
        </div>

        <div className="bg-black/20 rounded-2xl overflow-hidden border border-white/5">
           <table className="w-full text-left text-sm">
             <thead className="bg-white/5 border-bottom border-white/5">
               <tr>
                 <th className="p-4 text-white/40 font-bold uppercase text-[10px]">Reference</th>
                 <th className="p-4 text-white/40 font-bold uppercase text-[10px]">Client</th>
                 <th className="p-4 text-white/40 font-bold uppercase text-[10px]">Status</th>
                 <th className="p-4 text-white/40 font-bold uppercase text-[10px]">Date</th>
               </tr>
             </thead>
             <tbody>
               <tr>
                 <td colSpan={4} className="p-12 text-center text-white/20 italic">
                   No {config.title.toLowerCase()} recorded yet.
                 </td>
               </tr>
             </tbody>
           </table>
        </div>
      </div>
    </div>
  );
}
