'use client';

import React, { useState, useEffect } from 'react';
import { getProducts, saveProduct, deleteProduct, scrapeWebsiteToKnowledgeBase } from './actions';

interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  description: string;
  image_url: string;
}

export default function ProductsLedger() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');

  const [form, setForm] = useState({
    name: '',
    price: 0,
    currency: 'USD',
    description: '',
    image_url: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const res = await getProducts();
    if (res.success) setProducts(res.products);
    setLoading(false);
  };

  const handleSave = async () => {
    const res = await saveProduct(editingId ? { ...form, id: editingId } : form);
    if (res.success) {
      setIsAdding(false);
      setEditingId(null);
      setForm({ name: '', price: 0, currency: 'USD', description: '', image_url: '' });
      fetchProducts();
    } else {
      alert(`Save failed: ${res.error}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this product?')) {
      const res = await deleteProduct(id);
      if (res.success) fetchProducts();
    }
  };

  const handleSync = async () => {
    if (!websiteUrl) {
      alert('Please enter your website URL first.');
      return;
    }
    setIsSyncing(true);
    const res = await scrapeWebsiteToKnowledgeBase(websiteUrl);
    setIsSyncing(false);
    if (res.success) {
      alert(`✅ Successfully extracted ${res.productsExtracted} products and prices!`);
      fetchProducts();
    } else {
      alert(`❌ Sync failed: ${res.error}`);
    }
  };

  const startEdit = (p: Product) => {
    setForm({ name: p.name, price: p.price, currency: p.currency, description: p.description, image_url: p.image_url });
    setEditingId(p.id);
    setIsAdding(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ── SYNC SECTION ── */}
      <div className="glass" style={{ padding: '24px', borderRadius: '24px', background: 'rgba(0,255,136,0.02)', border: '1px solid rgba(0,255,136,0.1)' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#00ff88', marginBottom: '12px' }}>✨ Automated Product Sync</h4>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '20px' }}>
          Connect your store or enter your website URL to automatically fetch all products and pricing.
        </p>
        
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <input 
            type="text" 
            placeholder="https://yourstore.com" 
            value={websiteUrl}
            onChange={e => setWebsiteUrl(e.target.value)}
            style={{ ...INPUT_STYLE, flex: 1 }} 
          />
          <button 
            onClick={handleSync} 
            disabled={isSyncing}
            style={{ 
              background: isSyncing ? '#333' : 'linear-gradient(135deg, #00ff88, #00d4ff)', 
              color: '#000', 
              border: 'none', 
              padding: '12px 24px', 
              borderRadius: '12px', 
              fontSize: '13px', 
              fontWeight: 800, 
              cursor: 'pointer',
              opacity: isSyncing ? 0.5 : 1
            }}
          >
            {isSyncing ? '⌛ SYNCING...' : '🚀 SYNC FROM URL'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '15px' }}>
          <button style={CONNECTOR_BTN} onClick={() => alert('Connect Shopify API coming soon!')}>
            <span style={{ fontSize: '18px' }}>🛍️</span> Connect Shopify
          </button>
          <button style={CONNECTOR_BTN} onClick={() => alert('Connect WooCommerce API coming soon!')}>
            <span style={{ fontSize: '18px' }}>🛒</span> Connect WooCommerce
          </button>
        </div>
      </div>

      {/* ── PRODUCT TABLE ── */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700 }}>📦 Product Catalog</h4>
          <button onClick={() => { setIsAdding(true); setEditingId(null); }} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>+ Manual Add</button>
        </div>

        {isAdding && (
          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <input type="text" placeholder="Product Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={INPUT_STYLE} />
              <input type="number" placeholder="Price" value={form.price} onChange={e => setForm({...form, price: parseFloat(e.target.value)})} style={INPUT_STYLE} />
            </div>
            <textarea placeholder="Product Description..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{ ...INPUT_STYLE, height: '60px', width: '100%' }} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button onClick={handleSave} style={{ background: '#00ff88', color: '#000', border: 'none', padding: '8px 20px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>{editingId ? 'Update' : 'Save Product'}</button>
              <button onClick={() => setIsAdding(false)} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ padding: '10px' }}>
          {loading ? <div style={{ padding: '40px', textAlign: 'center' }}>Loading products...</div> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'rgba(255,255,255,0.4)' }}>
                  <th style={{ padding: '12px' }}>Product</th>
                  <th style={{ padding: '12px' }}>Price</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: '12px', color: '#00ff88', fontWeight: 800 }}>{p.currency} {p.price}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button onClick={() => startEdit(p)} style={{ background: 'none', border: 'none', color: '#00ff88', cursor: 'pointer', marginRight: '10px' }}>✎</button>
                      <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', color: '#ff4b2b', cursor: 'pointer' }}>🗑</button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>No products found. Use the sync tool above!</td>
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

const CONNECTOR_BTN: React.CSSProperties = {
  flex: 1,
  padding: '12px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  color: '#fff',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  transition: 'all 0.3s ease'
};
