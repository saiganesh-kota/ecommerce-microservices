// src/services/api.js
// Central Axios instance + all API calls

import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE_URL, withCredentials: true });

// ─── Attach token to every request ───────────────────────────────────────────
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Auto-refresh on 401 ──────────────────────────────────────────────────────
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: refresh });
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        original.headers.Authorization = `Bearer ${data.token}`;
        return api(original);
      } catch (_) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register:       data  => api.post('/auth/register', data),
  login:          data  => api.post('/auth/login', data),
  logout:         data  => api.post('/auth/logout', data),
  me:             ()    => api.get('/auth/me'),
  forgotPassword: email => api.post('/auth/forgot-password', { email }),
  resetPassword:  (token, password) => api.put(`/auth/reset-password/${token}`, { password }),
};

// ─── Products ─────────────────────────────────────────────────────────────────
export const productsAPI = {
  getAll:      params => api.get('/products', { params }),
  getById:     id     => api.get(`/products/${id}`),
  getCategories:()    => api.get('/products/categories'),
  create:      data   => api.post('/products', data),
  update:      (id, data) => api.put(`/products/${id}`, data),
  delete:      id     => api.delete(`/products/${id}`),
  addReview:   (id, data) => api.post(`/products/${id}/reviews`, data),
};

// ─── Cart ─────────────────────────────────────────────────────────────────────
export const cartAPI = {
  get:       ()              => api.get('/cart'),
  add:       (productId, qty, variant) => api.post('/cart', { productId, qty, variant }),
  update:    (itemId, qty)   => api.put(`/cart/${itemId}`, { qty }),
  remove:    itemId          => api.delete(`/cart/${itemId}`),
  clear:     ()              => api.delete('/cart'),
  applyPromo:code            => api.post('/cart/promo', { code }),
};

// ─── Orders ───────────────────────────────────────────────────────────────────
export const ordersAPI = {
  create:      data       => api.post('/orders', data),
  getMy:       params     => api.get('/orders/my', { params }),
  getById:     id         => api.get(`/orders/${id}`),
  pay:         (id, data) => api.put(`/orders/${id}/pay`, data),
  getAll:      params     => api.get('/orders', { params }),
  updateStatus:(id, data) => api.put(`/orders/${id}/status`, data),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersAPI = {
  updateProfile:  data => api.put('/users/profile', data),
  toggleWishlist: id   => api.post(`/users/wishlist/${id}`),
  getWishlist:    ()   => api.get('/users/wishlist'),
  addAddress:     data => api.post('/users/addresses', data),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminAPI = {
  dashboard: () => api.get('/admin/dashboard'),
  getUsers:  params => api.get('/admin/users', { params }),
  setRole:   (id, role) => api.put(`/admin/users/${id}/role`, { role }),
};

// ─── ML Service ───────────────────────────────────────────────────────────────
const ML_URL = process.env.REACT_APP_ML_URL || 'http://localhost:8000';
const ml = axios.create({ baseURL: ML_URL });

export const mlAPI = {
  track:           data => ml.post('/track', data),
  recommendations: uid  => ml.get(`/recommendations/${uid}`),
  alsoBought:      pid  => ml.get(`/also-bought/${pid}`),
  sentiment:       text => ml.post('/sentiment', { review_text: text }),
  rankSearch:      data => ml.post('/search/rank', data),
};

export default api;
