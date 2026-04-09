'use client';

import React, { useState, useEffect } from 'react';
import { getServicesPricing, saveServicePrice, deleteServicePrice, scrapeWebsiteToKnowledgeBase } from './actions';

interface Service {
  id: string;
  name: string;
  price: number;
  currency: string;
  unit: string;
  description: string;
}

export default function ServiceLedger() {
  const [services, setServices] = useState<Service[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');

  const [form, setForm] = useState({
    name: '',
    price: 0,
    currency: 'USD',
    unit: 'service',
    description: ''
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    const res = await getServicesPricing();
    if (res.success) setServices(res.services);
    setLoading(false);
  };

  const handleSave = async () => {
    const res = await saveServicePrice(editingId ? { ...form, id: editingId } : form);
    if (res.success) {
      setIsAdding(false);
      setEditingId(null);
      setForm({ name: '', price: 0, currency: 'USD', unit: 'service', description: '' });
      fetchServices();
    } else {
      alert(`Save failed: ${res.error}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this service?')) {
      const res = await deleteServicePrice(id);
      if (res.success) fetchServices();
    }
  };

  const startEdit = (s: Service) => {
    setForm({ name: s.name, price: s.price, currency: s.currency, unit: s.unit || 'service', description: s.description });
    setEditingId(s.id);
    setIsAdding(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ── SERVICE TABLE ── */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700 }}>🏥 Service Catalog</h4>
          <button onClick={() => { setIsAdding(true); setEditingId(null); }} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>+ Add Service</button>
        </div>

        {isAdding && (
          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '15px', marginBottom: '15px' }}>
              <input type="text" placeholder="Service Name (e.g. Consultation)" value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={INPUT_STYLE} />
              <input type="number" placeholder="Price" value={form.price} onChange={e => setForm({...form, price: parseFloat(e.target.value)})} style={INPUT_STYLE} />
              <input type="text" placeholder="Per (hr/visit)" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} style={INPUT_STYLE} />
            </div>
            <textarea placeholder="Service Description..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{ ...INPUT_STYLE, height: '60px', width: '100%' }} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button onClick={handleSave} style={{ background: '#00ff88', color: '#000', border: 'none', padding: '8px 20px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>{editingId ? 'Update' : 'Save Service'}</button>
              <button onClick={() => setIsAdding(false)} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ padding: '10px' }}>
          {loading ? <div style={{ padding: '40px', textAlign: 'center' }}>Loading services...</div> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'rgba(255,255,255,0.4)' }}>
                  <th style={{ padding: '12px' }}>Service</th>
                  <th style={{ padding: '12px' }}>Price</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map(s => (
                  <tr key={s.id} style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{s.name}</td>
                    <td style={{ padding: '12px', color: '#00ff88', fontWeight: 800 }}>{s.currency} {s.price} <span style={{fontSize: '10px', opacity: 0.5}}>/{s.unit}</span></td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button onClick={() => startEdit(s)} style={{ background: 'none', border: 'none', color: '#00ff88', cursor: 'pointer', marginRight: '10px' }}>✎</button>
                      <button onClick={() => handleDelete(s.id)} style={{ background: 'none', border: 'none', color: '#ff4b2b', cursor: 'pointer' }}>🗑</button>
                    </td>
                  </tr>
                ))}
                {services.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>No services found. Use the sync tool on the products tab to fetch all!</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const INPUT_STYLE: React.CSSProperties = {
  padding: '12px 16px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  color: '#fff',
  fontSize: '14px',
  outline: 'none'
};
