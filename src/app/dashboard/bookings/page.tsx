'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('bookings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        setBookings(data || []);
      }
      setLoading(false);
    })();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const supabase = createClient();
    await supabase.from('bookings').update({ status }).eq('id', id);
    setBookings(bookings.map(b => b.id === id ? { ...b, status } : b));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#00ff88';
      case 'cancelled': return '#ef4444';
      default: return '#f59e0b';
    }
  };

  return (
    <div style={{ padding: '40px' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', background: 'linear-gradient(135deg,#fff,#888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Lead Booking Commands 📅
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>Track and manage appointment requests captured by your ChatSela Sales Engine.</p>
      </header>

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.4)' }}>Loading your commands...</div>
      ) : bookings.length === 0 ? (
        <div className="glass" style={{ padding: '40px', borderRadius: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: '40px', display: 'block', marginBottom: '16px' }}>📭</span>
          No booking requests yet. Once a customer asks to book on WhatsApp, they'll appear here!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {bookings.map(booking => (
            <div key={booking.id} className="glass" style={{ padding: '24px', borderRadius: '24px', position: 'relative', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>{booking.customer_name || 'Anonymous Customer'}</h4>
                  <p style={{ fontSize: '13px', color: '#00ff88', fontWeight: 600 }}>{booking.customer_phone}</p>
                </div>
                <span style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '20px', background: `${getStatusColor(booking.status)}22`, color: getStatusColor(booking.status), fontWeight: 800, textTransform: 'uppercase', border: `1px solid ${getStatusColor(booking.status)}44` }}>
                  {booking.status}
                </span>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>📅 Requested Time</p>
                <p style={{ fontSize: '15px', color: '#fff' }}>{booking.proposed_time}</p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>📝 Intelligence Feed</p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>"{booking.details}"</p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => updateStatus(booking.id, 'confirmed')}
                  style={{ flex: 1, background: 'rgba(0,255,136,0.1)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.2)', padding: '10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Confirm ✅
                </button>
                <button 
                  onClick={() => updateStatus(booking.id, 'cancelled')}
                  style={{ flex: 1, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
