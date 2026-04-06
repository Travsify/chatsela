'use client'

import React, { useState, useEffect } from 'react';
import { getProducts, addProduct, deleteProduct } from './actions';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: 0, currency: 'USD' });

  const fetchProducts = async () => {
    const res = await getProducts();
    if (res.success && res.products) setProducts(res.products);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    const res = await addProduct(newProduct);
    if (res.success && res.product) {
      setProducts([res.product, ...products]);
      setNewProduct({ name: '', description: '', price: 0, currency: 'USD' });
      setShowModal(false);
    } else {
      alert('❌ Failed to add product');
    }
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    const res = await deleteProduct(id);
    if (res.success) {
      setProducts(products.filter(p => p.id !== id));
    } else {
      alert('❌ Delete failed');
    }
  };

  const INPUT_STYLE: React.CSSProperties = {
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    color: '#fff',
    outline: 'none',
    width: '100%',
    marginBottom: '16px'
  };

  return (
    <main style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', background: 'linear-gradient(135deg,#fff,#888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            📦 Product Catalog
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>Train your AI on what you sell and let it close deals automatically.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="glow-btn" style={{ padding: '12px 24px', borderRadius: '14px' }}>
          + Add Product
        </button>
      </header>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', padding: '40px', borderRadius: '32px', width: '100%', maxWidth: '500px', position: 'relative' }}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            <h2 style={{ fontSize: '24px', marginBottom: '24px' }}>Add New Product</h2>
            <form onSubmit={handleAddProduct}>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', display: 'block' }}>Product Name</label>
              <input value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required style={INPUT_STYLE} placeholder="e.g. Premium Coffee Beans" />
              
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', display: 'block' }}>Description</label>
              <textarea rows={3} value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} style={{ ...INPUT_STYLE, resize: 'none' }} placeholder="Short selling point..." />
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', display: 'block' }}>Price</label>
                  <input type="number" step="0.01" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} style={INPUT_STYLE} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', display: 'block' }}>Currency</label>
                  <select value={newProduct.currency} onChange={e => setNewProduct({...newProduct, currency: e.target.value})} style={INPUT_STYLE}>
                    <option value="USD">USD</option>
                    <option value="NGN">NGN</option>
                    <option value="GBP">GBP</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <button disabled={isAdding} className="glow-btn" style={{ width: '100%', marginTop: '10px' }}>
                {isAdding ? 'ADDING PRODUCT...' : 'SAVE PRODUCT'}
              </button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px', opacity: 0.3 }}>Loading your catalog...</div>
      ) : products.length === 0 ? (
        <section className="glass" style={{ padding: '60px', borderRadius: '32px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🛍️</div>
          <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '12px' }}>Your Vault is Empty</h3>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', maxWidth: '400px', margin: '0 auto 32px' }}>Add products to your catalog so the AI can offer them to customers in real-time.</p>
          <button onClick={() => setShowModal(true)} className="glow-btn">Initialize Catalog</button>
        </section>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {products.map(p => (
            <div key={p.id} className="glass" style={{ padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                  📦
                </div>
                <button onClick={() => handleDelete(p.id)} style={{ color: 'rgba(255,68,68,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
              </div>
              <div>
                <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>{p.name}</h4>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5', minHeight: '40px' }}>{p.description || 'No description provided.'}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--accent-primary)' }}>
                  {p.currency} {p.price.toLocaleString()}
                </div>
                <span style={{ fontSize: '11px', color: 'rgba(0,255,136,0.5)', background: 'rgba(0,255,136,0.05)', padding: '4px 10px', borderRadius: '20px', fontWeight: 700 }}>
                  ACTIVE
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
