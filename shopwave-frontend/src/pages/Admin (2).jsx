// src/pages/Admin.js
import React, { useEffect, useState } from 'react';
import { adminAPI, productsAPI } from '../services/api';
import { emitToast } from '../hooks';

export default function Admin() {
  const [tab,     setTab]     = useState('dashboard');
  const [data,    setData]    = useState(null);
  const [users,   setUsers]   = useState([]);
  const [products,setProducts]= useState([]);
  const [loading, setLoading] = useState(true);

  // New product form state
  const [form, setForm] = useState({ name: '', category: 'Electronics', price: '', stock: '', description: '', emoji: '', badge: '' });

  useEffect(() => {
    adminAPI.dashboard()
      .then(({ data: d }) => setData(d))
      .catch(() => emitToast('Failed to load dashboard', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'users') {
      adminAPI.getUsers().then(({ data: d }) => setUsers(d.users));
    }
    if (tab === 'products') {
      productsAPI.getAll({ limit: 50 }).then(({ data: d }) => setProducts(d.products));
    }
  }, [tab]);

  const handleAddProduct = async () => {
    try {
      await productsAPI.create({ ...form, price: +form.price, stock: +form.stock });
      emitToast('Product added!', 'success');
      setForm({ name: '', category: 'Electronics', price: '', stock: '', description: '', emoji: '📦', badge: '' });
      productsAPI.getAll({ limit: 50 }).then(({ data: d }) => setProducts(d.products));
    } catch (e) {
      emitToast(e.response?.data?.message || 'Failed to add product', 'error');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Deactivate this product?')) return;
    try {
      await productsAPI.delete(id);
      setProducts(p => p.filter(x => x._id !== id));
      emitToast('Product deactivated', 'success');
    } catch { emitToast('Failed', 'error'); }
  };

  const StatCard = ({ icon, label, value, change, up }) => (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {change && <div className={`stat-change ${up ? 'up' : 'down'}`}>{up ? '↑' : '↓'} {change}</div>}
    </div>
  );

  if (loading) return <div className="page-loading">Loading dashboard...</div>;

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-tabs">
          {['dashboard','products','orders','users'].map(t => (
            <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Dashboard ────────────────────────────────────────────────────── */}
      {tab === 'dashboard' && data && (
        <>
          <div className="stats-grid">
            <StatCard icon="💰" label="Total Revenue"    value={`$${data.stats.totalRevenue.toLocaleString()}`} change="12.4% this month" up />
            <StatCard icon="📦" label="Total Orders"     value={data.stats.totalOrders.toLocaleString()} change="8.7% this month" up />
            <StatCard icon="👥" label="Customers"        value={data.stats.totalUsers.toLocaleString()} change="5.2% this month" up />
            <StatCard icon="🛍" label="Products"         value={data.stats.totalProducts} />
            <StatCard icon="💵" label="Avg. Order Value" value={`$${data.stats.avgOrderValue}`} change="3.1% this month" up />
          </div>

          <div className="admin-tables">
            <div className="admin-table-wrap">
              <h3>Recent Orders</h3>
              <table>
                <thead><tr><th>Order #</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {data.recentOrders?.map(o => (
                    <tr key={o._id}>
                      <td><strong>{o.orderNumber}</strong></td>
                      <td>{o.user?.firstName} {o.user?.lastName}</td>
                      <td>${o.totalPrice?.toFixed(2)}</td>
                      <td><span className={`status-badge status-${o.status}`}>{o.status}</span></td>
                      <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-table-wrap">
              <h3>Top Products</h3>
              <table>
                <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Sold</th></tr></thead>
                <tbody>
                  {data.topProducts?.map(p => (
                    <tr key={p._id}>
                      <td>{p.emoji} <strong>{p.name}</strong></td>
                      <td>{p.category}</td>
                      <td>${p.price}</td>
                      <td>{p.soldCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Products ─────────────────────────────────────────────────────── */}
      {tab === 'products' && (
        <>
          <div className="add-product-form admin-card">
            <h3>Add New Product</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Name</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Product name" />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {['Electronics','Fashion','Home','Sports','Beauty'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Price ($)</label>
                <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label>Stock</label>
                <input type="number" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} placeholder="0" />
              </div>
              <div className="form-group">
                <label>Emoji Icon</label>
                <input value={form.emoji} onChange={e => setForm(p => ({ ...p, emoji: e.target.value }))} placeholder="📦" maxLength={2} />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Product description..." />
            </div>
            <button className="btn-primary" onClick={handleAddProduct}>Add Product</button>
          </div>

          <div className="admin-table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Rating</th><th>Actions</th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p._id}>
                    <td>{p.emoji} <strong>{p.name}</strong></td>
                    <td>{p.category}</td>
                    <td>${p.price}</td>
                    <td><span className={p.stock > 10 ? 'stock-ok' : p.stock > 0 ? 'stock-low' : 'stock-out'}>{p.stock}</span></td>
                    <td>⭐ {p.rating} ({p.numReviews})</td>
                    <td>
                      <button className="btn-sm btn-danger" onClick={() => handleDeleteProduct(p._id)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Users ─────────────────────────────────────────────────────────── */}
      {tab === 'users' && (
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td><strong>{u.firstName} {u.lastName}</strong></td>
                  <td>{u.email}</td>
                  <td><span className={`role-badge role-${u.role}`}>{u.role}</span></td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="btn-sm btn-outline"
                      onClick={() => adminAPI.setRole(u._id, u.role === 'admin' ? 'user' : 'admin')
                        .then(() => { emitToast('Role updated', 'success'); adminAPI.getUsers().then(({ data: d }) => setUsers(d.users)); })}>
                      Toggle Role
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
