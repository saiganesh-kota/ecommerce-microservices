// src/hooks/index.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { productsAPI, ordersAPI, usersAPI } from '../services/api';

// ─── useProducts ──────────────────────────────────────────────────────────────
export function useProducts(initialParams = {}) {
  const [products,   setProducts]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [params,     setParams]     = useState(initialParams);

  const fetch = useCallback(async (overrides = {}) => {
    setLoading(true); setError(null);
    try {
      const { data } = await productsAPI.getAll({ ...params, ...overrides });
      setProducts(data.products);
      setPagination(data.pagination);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { fetch(); }, [fetch]);

  return { products, loading, error, pagination, params, setParams, refetch: fetch };
}

// ─── useProduct ───────────────────────────────────────────────────────────────
export function useProduct(id) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    productsAPI.getById(id)
      .then(({ data }) => setProduct(data.product))
      .catch(e => setError(e.response?.data?.message || 'Product not found'))
      .finally(() => setLoading(false));
  }, [id]);

  return { product, loading, error };
}

// ─── useOrders ────────────────────────────────────────────────────────────────
export function useOrders() {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    ordersAPI.getMy()
      .then(({ data }) => setOrders(data.orders))
      .catch(e => setError(e.response?.data?.message || 'Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  return { orders, loading, error };
}

// ─── useWishlist ──────────────────────────────────────────────────────────────
export function useWishlist() {
  const [wishlist, setWishlist] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    usersAPI.getWishlist()
      .then(({ data }) => setWishlist(data.wishlist))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = useCallback(async (productId) => {
    const { data } = await usersAPI.toggleWishlist(productId);
    // Re-fetch wishlist products
    const { data: wdata } = await usersAPI.getWishlist();
    setWishlist(wdata.wishlist);
    return data.wishlist;
  }, []);

  const isWishlisted = useCallback(
    (productId) => wishlist.some(p => (p._id || p) === productId),
    [wishlist]
  );

  return { wishlist, loading, toggle, isWishlisted };
}

// ─── useDebounce ──────────────────────────────────────────────────────────────
export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── useLocalStorage ─────────────────────────────────────────────────────────
export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try { const item = localStorage.getItem(key); return item ? JSON.parse(item) : initial; }
    catch { return initial; }
  });

  const set = useCallback((val) => {
    setValue(val);
    localStorage.setItem(key, JSON.stringify(val));
  }, [key]);

  return [value, set];
}

// ─── useToast ─────────────────────────────────────────────────────────────────
const toastListeners = new Set();
export function emitToast(message, type = 'success') {
  toastListeners.forEach(fn => fn({ message, type, id: Date.now() }));
}

export function useToastListener(callback) {
  useEffect(() => {
    toastListeners.add(callback);
    return () => toastListeners.delete(callback);
  }, [callback]);
}

// ─── useIntersectionObserver (infinite scroll) ────────────────────────────────
export function useIntersectionObserver(callback, options = {}) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) callback();
    }, options);
    observer.observe(el);
    return () => observer.disconnect();
  }, [callback, options]);
  return ref;
}
