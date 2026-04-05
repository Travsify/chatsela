import React from 'react';

export default function ProductsPage() {
  return (
    <main style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>📦 My Products</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Manage the products you want your AI Assistant to sell.</p>
        </div>
        <button className="glow-btn" style={{ padding: '10px 20px', borderRadius: '12px' }}>+ Add Product</button>
      </header>

      <div className="glass" style={{ padding: '40px', borderRadius: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛍️</div>
        <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>No products yet</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>Add your first product to train your AI on what it should sell.</p>
      </div>
    </main>
  );
}
