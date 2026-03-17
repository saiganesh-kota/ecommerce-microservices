import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate, useParams } from 'react-router-dom';

// ─── API base (proxied via vite.config.js to :5000) ─────────────────────────
const API = '/api';

async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(API + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...opts,
  });
  return res.json();
}

// ─── Auth Context ─────────────────────────────────────────────────────────────
const AuthCtx = createContext(null);
function useAuth() { return useContext(AuthCtx); }

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sw_user')); } catch { return null; }
  });

  const login = (userData, token, refresh) => {
    localStorage.setItem('token', token);
    if (refresh) localStorage.setItem('refreshToken', refresh);
    localStorage.setItem('sw_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('sw_user');
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, login, logout }}>{children}</AuthCtx.Provider>;
}

// ─── Cart Context ──────────────────────────────────────────────────────────────
const CartCtx = createContext(null);
function useCart() { return useContext(CartCtx); }

function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sw_cart')) || []; } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('sw_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        return prev.map(item => item._id === product._id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item._id !== id));
  const updateQty = (id, qty) => {
    if (qty < 1) return removeFromCart(id);
    setCart(prev => prev.map(item => item._id === id ? { ...item, qty } : item));
  };
  const clearCart = () => setCart([]);
  const cartCount = cart.reduce((total, item) => total + item.qty, 0);
  const cartTotal = cart.reduce((total, item) => total + (item.price * item.qty), 0);

  return (
    <CartCtx.Provider value={{ cart, addToCart, removeFromCart, updateQty, clearCart, cartCount, cartTotal }}>
      {children}
    </CartCtx.Provider>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = (msg, type = 'info') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };
  const ToastContainer = () => (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
      ))}
    </div>
  );
  return { show, ToastContainer };
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ onOpenCart }) {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <nav className="navbar">
      <Link to="/" className="brand">🛍 ShopWave</Link>
      <div className="nav-links">
        <Link to="/shop">Shop</Link>
        <Link to="/track-order/SEARCH">Track Order</Link>
        <button className="btn-ghost cart-btn" onClick={onOpenCart}>
          🛒 Cart {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </button>
        {user ? (
          <>
            <span className="user-name">👋 {user.firstName}</span>
            <button className="btn-ghost" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register" className="btn-nav-signup">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}

// ─── Cart Drawer ─────────────────────────────────────────────────────────────
function CartDrawer({ isOpen, onClose }) {
  const { cart, removeFromCart, updateQty, cartTotal } = useCart();
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-content" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <h2>Your Cart</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <span style={{ fontSize: '3rem' }}>🛒</span>
              <p>Your cart is empty</p>
              <button className="btn-primary" onClick={onClose}>Start Shopping</button>
            </div>
          ) : (
            <div className="cart-items">
              {cart.map(item => (
                <div key={item._id} className="cart-item">
                  <span className="item-emoji">{item.emoji || '📦'}</span>
                  <div className="item-info">
                    <h4>{item.name}</h4>
                    <p>${item.price.toFixed(2)}</p>
                    <div className="qty-controls">
                      <button onClick={() => updateQty(item._id, item.qty - 1)}>-</button>
                      <span>{item.qty}</span>
                      <button onClick={() => updateQty(item._id, item.qty + 1)}>+</button>
                    </div>
                  </div>
                  <button className="remove-btn" onClick={() => removeFromCart(item._id)}>🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="drawer-footer">
            <div className="cart-summary-line">
              <span>Subtotal:</span>
              <strong>${cartTotal.toFixed(2)}</strong>
            </div>
            <button className="btn-primary btn-full" onClick={() => { onClose(); navigate('/checkout'); }}>
              Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────
function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { show, ToastContainer } = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const update = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (!form.email || !form.password) { show('Please fill all fields', 'error'); return; }
    setLoading(true);
    try {
      const d = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(form) });
      if (d.success) {
        login(d.user, d.token, d.refreshToken);
        show('Welcome back!', 'success');
        setTimeout(() => navigate('/'), 600);
      } else {
        show(d.message || 'Login failed', 'error');
      }
    } catch {
      show('Cannot reach the server. Is the backend running?', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="auth-wrap">
      <ToastContainer />
      <form onSubmit={submit} className="auth-form">
        <div className="auth-logo">🛍</div>
        <h2>Welcome back</h2>
        <p className="auth-sub">Sign in to your ShopWave account</p>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={form.email} onChange={update('email')} placeholder="you@example.com" required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={form.password} onChange={update('password')} placeholder="••••••••" required />
        </div>
        <button type="submit" className="btn-primary btn-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
        <p className="auth-switch">Don't have an account? <Link to="/register">Create one</Link></p>
      </form>
    </div>
  );
}

// ─── Register Page ────────────────────────────────────────────────────────────
function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { show, ToastContainer } = useToast();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const update = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (form.password.length < 6) { show('Password must be at least 6 characters', 'error'); return; }
    setLoading(true);
    try {
      const d = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(form) });
      if (d.success) {
        login(d.user, d.token, d.refreshToken);
        show('Account created! Welcome 🎉', 'success');
        setTimeout(() => navigate('/'), 600);
      } else {
        show(d.message || 'Registration failed', 'error');
      }
    } catch {
      show('Cannot reach the server. Is the backend running?', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="auth-wrap">
      <ToastContainer />
      <form onSubmit={submit} className="auth-form">
        <div className="auth-logo">🛍</div>
        <h2>Create account</h2>
        <p className="auth-sub">Join thousands of happy shoppers</p>
        <div className="two-col">
          <div className="form-group">
            <label>First Name</label>
            <input value={form.firstName} onChange={update('firstName')} placeholder="John" required />
          </div>
          <div className="form-group">
            <label>Last Name</label>
            <input value={form.lastName} onChange={update('lastName')} placeholder="Doe" required />
          </div>
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={form.email} onChange={update('email')} placeholder="you@example.com" required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={form.password} onChange={update('password')} placeholder="Min. 6 characters" required />
        </div>
        <button type="submit" className="btn-primary btn-full" disabled={loading}>
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
        <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}

// ─── Checkout Page ────────────────────────────────────────────────────────────
function Checkout() {
  const { cart, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { show, ToastContainer } = useToast();
  const [loading, setLoading] = useState(false);

  if (cart.length === 0) return <Navigate to="/shop" />;

  const handleOrder = async (e) => {
    e.preventDefault();
    if (!user) { show('Please login to complete order', 'error'); navigate('/login'); return; }
    
    setLoading(true);
    // Simulate API delay
    setTimeout(() => {
      clearCart();
      navigate('/order-success');
    }, 1500);
  };

  return (
    <div className="checkout-page">
      <ToastContainer />
      <h1>Checkout</h1>
      <div className="checkout-grid">
        <div className="checkout-form-wrap">
          <form className="auth-form" onSubmit={handleOrder}>
            <h3>Shipping Details</h3>
            <div className="form-group">
              <label>Address</label>
              <input placeholder="123 Main St" required />
            </div>
            <div className="two-col">
              <div className="form-group">
                <label>City</label>
                <input placeholder="New York" required />
              </div>
              <div className="form-group">
                <label>Zip</label>
                <input placeholder="10001" required />
              </div>
            </div>
            <h3 style={{ marginTop: '1.5rem' }}>Payment Info</h3>
            <div className="form-group">
              <label>Card Number</label>
              <input placeholder="•••• •••• •••• ••••" required />
            </div>
            <button className="btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? 'Processing...' : `Confirm Order — $${cartTotal.toFixed(2)}`}
            </button>
          </form>
        </div>

        <div className="order-summary">
          <h3>Order Summary</h3>
          <div className="summary-items">
            {cart.map(item => (
              <div key={item._id} className="summary-item">
                <span>{item.emoji} {item.name} (x{item.qty})</span>
                <span>${(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="summary-total">
            <span>Total</span>
            <strong>${cartTotal.toFixed(2)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Order Success ────────────────────────────────────────────────────────────
function OrderSuccess() {
  const orderId = Math.random().toString(36).substring(2, 10).toUpperCase();
  return (
    <div className="confirmation-wrap">
      <div className="confirmation-card">
        <div className="success-icon">🎉</div>
        <h2>Order Confirmed!</h2>
        <div className="order-badge">Order ID: #{orderId}</div>
        <p>Thank you for shopping with ShopWave. Your order is being processed and will be delivered soon.</p>
        <div className="confirmation-ctas">
          <Link to={`/track-order/${orderId}`} className="btn-primary btn-lg btn-full">Track Your Order Now</Link>
          <Link to="/shop" className="btn-outline btn-full">Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
}

// ─── Track Order ──────────────────────────────────────────────────────────────
function TrackOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState(0); // 0: Placed, 1: Processing, 2: Shipped, 3: Delivered
  const [searchId, setSearchId] = useState('');

  useEffect(() => {
    if (!id || id === 'SEARCH' || id === 'TRACKING-ID') return;
    const timer = setInterval(() => {
      setStatus(s => (s < 3 ? s + 1 : s));
    }, 4000);
    return () => clearInterval(timer);
  }, [id]);

  const handleSearch = () => {
    if (searchId.trim()) {
      navigate(`/track-order/${searchId.trim().toUpperCase()}`);
      setSearchId('');
    }
  };

  if (!id || id === 'SEARCH' || id === 'TRACKING-ID') {
    return (
      <div className="track-page">
        <div className="track-card text-center" style={{ padding: '4rem 2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🔍</div>
          <h2>Find Your Order</h2>
          <p style={{ color: 'var(--text2)', marginBottom: '2rem' }}>
            Enter your Order ID from your confirmation screen or email to see its real-time status.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <input 
              type="text" 
              placeholder="e.g. AB123XYZ" 
              className="form-control" 
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              style={{ width: '200px', textAlign: 'center' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
            />
            <button className="btn-primary" onClick={handleSearch}>Track</button>
          </div>
          <Link to="/shop" className="btn-ghost" style={{ marginTop: '2rem', display: 'inline-block' }}>Need to buy something first?</Link>
        </div>
      </div>
    );
  }

  const steps = [
    { label: 'Order Placed', icon: '📝', desc: 'We have received your order' },
    { label: 'Processing', icon: '⚙️', desc: 'Preparing your items' },
    { label: 'Shipped', icon: '🚚', desc: 'Your order is on the way' },
    { label: 'Delivered', icon: '🎁', desc: 'Order arrived at destination' }
  ];

  return (
    <div className="track-page">
      <div className="track-card">
        <div className="track-header">
          <h2>Track Order</h2>
          <span className="order-id">#{id}</span>
        </div>
        
        <div className="track-progress">
          {steps.map((step, i) => (
            <div key={i} className={`track-step ${i <= status ? 'active' : ''}`}>
              <div className="step-icon-wrap">
                <span className="step-icon">{step.icon}</span>
                {i < steps.length - 1 && <div className="step-line" />}
              </div>
              <div className="step-text">
                <strong>{step.label}</strong>
                <p>{i <= status ? step.desc : 'Scheduled'}</p>
              </div>
            </div>
          ))}
        </div>

        {status === 3 && (
          <div className="delivery-success" style={{ marginTop: '2.5rem' }}>
            <div className="success-emoji" style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉✨</div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Thanks, yours is delivered!</h3>
            <p style={{ color: 'var(--text2)', marginBottom: '1.5rem' }}>We hope you enjoy your purchase. Thank you for choosing ShopWave!</p>
            <button className="btn-primary btn-full" onClick={() => navigate('/shop')}>Order Something Else</button>
          </div>
        )}

        <div className="track-footer">
          <p>Estimated Delivery: <strong>{status === 3 ? 'Delivered' : '2–3 Business Days'}</strong></p>
          <Link to="/shop" className="btn-ghost" style={{ marginTop: '1.5rem', display: 'inline-block' }}>Back to Shop</Link>
        </div>
      </div>
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ p }) {
  const { addToCart } = useCart();
  const { show } = useToast();

  const handleAdd = () => {
    addToCart(p);
    show(`${p.emoji || '📦'} ${p.name} added!`, 'success');
  };

  return (
    <div className="product-card">
      <div className="product-emoji">{p.emoji || '📦'}</div>
      {p.badge && <span className="badge">{p.badge}</span>}
      <div className="product-body">
        <p className="product-cat">{p.category}</p>
        <h3 className="product-name">{p.name}</h3>
        <p className="product-desc">{p.description?.slice(0, 80)}{p.description?.length > 80 ? '…' : ''}</p>
      </div>
      <div className="product-footer">
        <span className="product-price">${Number(p.price || 0).toFixed(2)}</span>
        <button className="btn-cart" onClick={handleAdd}>Add to Cart</button>
      </div>
    </div>
  );
}

// ─── Shop Page ────────────────────────────────────────────────────────────────
function Shop() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { ToastContainer } = useToast();

  useEffect(() => {
    apiFetch('/products?limit=50')
      .then(d => { setProducts(d.products || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <ToastContainer />
      <div className="shop-header">
        <h1>All Products</h1>
        <input
          className="search-bar"
          placeholder="🔍 Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🛍</div>
          <h3>No products found</h3>
          <p>Try adjusting your search, or seed the database with <code>node seed.js</code> in the backend folder.</p>
        </div>
      ) : (
        <div className="product-grid">
          {filtered.map(p => <ProductCard key={p._id} p={p} />)}
        </div>
      )}
    </div>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────
function Home() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const { ToastContainer } = useToast();

  useEffect(() => {
    apiFetch('/products?limit=8').then(d => setProducts(d.products || []));
  }, []);

  return (
    <div>
      <ToastContainer />
      <div className="hero">
        <div className="hero-badge">✨ New Season Sale — Up to 50% off</div>
        <h1>Shop the Future<br/><span className="grad">with ShopWave</span></h1>
        <p>Discover thousands of products at unbeatable prices, delivered fast to your door.</p>
        <div className="hero-ctas">
          <Link to="/shop" className="btn-primary btn-lg">Browse Products</Link>
          {!user && <Link to="/register" className="btn-outline btn-lg">Join Free</Link>}
        </div>
      </div>

      <div className="features">
        {[
          ['🚀', 'Fast Delivery', 'Orders arrive in 2–3 business days'],
          ['🔒', 'Secure Checkout', 'Your payment data is always encrypted'],
          ['🔄', 'Easy Returns', '30-day hassle-free return policy'],
          ['💬', '24/7 Support', 'Our team is always here to help'],
        ].map(([icon, title, desc]) => (
          <div key={title} className="feature-card">
            <span className="feature-icon">{icon}</span>
            <strong>{title}</strong>
            <p>{desc}</p>
          </div>
        ))}
      </div>

      {products.length > 0 && (
        <section>
          <div className="section-header">
            <h2>Featured Products</h2>
            <Link to="/shop" className="see-all">See all →</Link>
          </div>
          <div className="product-grid">
            {products.map(p => <ProductCard key={p._id} p={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Not Found ────────────────────────────────────────────────────────────────
function NotFound() {
  return (
    <div className="empty-state" style={{ marginTop: '5rem' }}>
      <div style={{ fontSize: '5rem' }}>404</div>
      <h2>Page not found</h2>
      <Link to="/" className="btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>Go Home</Link>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="app">
            <Navbar onOpenCart={() => setIsCartOpen(true)} />
            <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order-success" element={<OrderSuccess />} />
                <Route path="/track-order/:id" element={<TrackOrder />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <footer className="footer">
              <p>© 2026 ShopWave — Built with ❤️ &nbsp;|&nbsp; <a href="http://localhost:5000/api/health" target="_blank" rel="noreferrer">API Health</a></p>
            </footer>
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}
