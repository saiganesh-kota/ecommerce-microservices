// src/context/CartContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartAPI } from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart,    setCart]    = useState({ items: [], subtotal: 0, itemCount: 0 });
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!user) { setCart({ items: [], subtotal: 0, itemCount: 0 }); return; }
    try {
      setLoading(true);
      const { data } = await cartAPI.get();
      setCart(data.cart);
    } catch (_) {} finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addToCart = useCallback(async (productId, qty = 1, variant = null) => {
    const { data } = await cartAPI.add(productId, qty, variant);
    setCart(data.cart);
  }, []);

  const updateQty = useCallback(async (itemId, qty) => {
    const { data } = await cartAPI.update(itemId, qty);
    setCart(data.cart);
  }, []);

  const removeItem = useCallback(async (itemId) => {
    const { data } = await cartAPI.remove(itemId);
    setCart(data.cart);
  }, []);

  const clearCart = useCallback(async () => {
    await cartAPI.clear();
    setCart({ items: [], subtotal: 0, itemCount: 0 });
  }, []);

  const applyPromo = useCallback(async (code) => {
    const { data } = await cartAPI.applyPromo(code);
    await fetchCart();
    return data;
  }, [fetchCart]);

  return (
    <CartContext.Provider value={{ cart, loading, addToCart, updateQty, removeItem, clearCart, applyPromo, fetchCart }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be inside CartProvider');
  return ctx;
};
