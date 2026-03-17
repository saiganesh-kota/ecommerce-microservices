// src/pages/Checkout.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart }      from '../context/CartContext';
import { useAuth }      from '../context/AuthContext';
import { ordersAPI }    from '../services/api';
import { emitToast }    from '../hooks';

const TAX_RATE         = 0.08;
const SHIPPING_THRESHOLD = 50;
const SHIPPING_COST    = 9.99;

const STEPS = ['Cart', 'Shipping', 'Payment', 'Review'];

export default function Checkout() {
  const navigate      = useNavigate();
  const { cart, clearCart } = useCart();
  const { user }      = useAuth();
  const [step,        setStep]        = useState(1);
  const [submitting,  setSubmitting]  = useState(false);
  const [promoMsg,    setPromoMsg]    = useState('');

  const [shipping, setShipping] = useState({
    firstName: user?.firstName || '',
    lastName:  user?.lastName  || '',
    street: '', city: '', state: '', zip: '', country: 'United States', phone: '',
  });

  const [payment, setPayment] = useState({
    method:     'card',
    cardNumber: '',
    expiry:     '',
    cvv:        '',
    nameOnCard: '',
  });

  const [promoCode, setPromoCode] = useState('');
  const [discount,  setDiscount]  = useState(0);

  const subtotal     = cart?.subtotal || 0;
  const shippingCost = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const tax          = +(subtotal * TAX_RATE).toFixed(2);
  const discountAmt  = +(subtotal * discount).toFixed(2);
  const total        = +(subtotal + shippingCost + tax - discountAmt).toFixed(2);

  const handleApplyPromo = async () => {
    try {
      const { data } = await import('../services/api').then(m => m.cartAPI.applyPromo(promoCode));
      setDiscount(data.discount);
      setPromoMsg(data.message);
    } catch (e) {
      setPromoMsg(e.response?.data?.message || 'Invalid code');
    }
  };

  const handlePlaceOrder = async () => {
    setSubmitting(true);
    try {
      const { data } = await ordersAPI.create({
        shippingAddress: shipping,
        paymentMethod:   payment.method,
        promoCode:       promoCode || undefined,
      });
      await clearCart();
      emitToast('Order placed! 🎉', 'success');
      navigate(`/orders/${data.order._id}`);
    } catch (e) {
      emitToast(e.response?.data?.message || 'Order failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const input = (label, field, type = 'text', placeholder = '') => (
    <div className="form-group">
      <label>{label}</label>
      <input
        type={type}
        value={shipping[field] || ''}
        placeholder={placeholder}
        onChange={e => setShipping(p => ({ ...p, [field]: e.target.value }))}
      />
    </div>
  );

  const payInput = (label, field, type = 'text', placeholder = '') => (
    <div className="form-group">
      <label>{label}</label>
      <input
        type={type}
        value={payment[field] || ''}
        placeholder={placeholder}
        onChange={e => setPayment(p => ({ ...p, [field]: e.target.value }))}
      />
    </div>
  );

  const OrderSummary = () => (
    <div className="order-summary-panel">
      <h3>Order Summary</h3>
      {cart?.items?.map(item => (
        <div key={item._id} className="summary-item">
          <span>{item.product?.emoji} {item.product?.name} ×{item.qty}</span>
          <span>${(item.price * item.qty).toFixed(2)}</span>
        </div>
      ))}
      <hr />
      <div className="summary-row"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
      <div className="summary-row"><span>Shipping</span><span>{shippingCost === 0 ? <b style={{ color: '#52c98a' }}>Free</b> : `$${shippingCost}`}</span></div>
      <div className="summary-row"><span>Tax (8%)</span><span>${tax}</span></div>
      {discountAmt > 0 && <div className="summary-row" style={{ color: '#52c98a' }}><span>Discount</span><span>-${discountAmt}</span></div>}
      <hr />
      <div className="summary-total"><span>Total</span><span>${total}</span></div>
    </div>
  );

  return (
    <div className="checkout-page">
      {/* Step indicator */}
      <div className="steps-bar">
        {STEPS.map((s, i) => (
          <div key={s} className={`step ${i === step ? 'active' : i < step ? 'done' : ''}`}>
            <div className="step-circle">{i < step ? '✓' : i + 1}</div>
            <span>{s}</span>
          </div>
        ))}
      </div>

      <div className="checkout-layout">
        <div className="checkout-main">

          {/* Step 1: Shipping */}
          {step === 1 && (
            <div className="checkout-card">
              <h2>Shipping Information</h2>
              <div className="form-row">
                {input('First Name', 'firstName', 'text', 'John')}
                {input('Last Name',  'lastName',  'text', 'Doe')}
              </div>
              {input('Street Address', 'street', 'text', '123 Main St')}
              <div className="form-row">
                {input('City',     'city', 'text', 'New York')}
                {input('ZIP Code', 'zip',  'text', '10001')}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Country</label>
                  <select value={shipping.country} onChange={e => setShipping(p => ({ ...p, country: e.target.value }))}>
                    {['United States','United Kingdom','Canada','Australia','India','Germany','France'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                {input('Phone', 'phone', 'tel', '+1 (555) 000-0000')}
              </div>
              <button className="btn-primary" onClick={() => setStep(2)}>Continue to Payment →</button>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <div className="checkout-card">
              <h2>Payment Method</h2>
              <div className="payment-methods">
                {[['card','💳','Credit / Debit Card'],['paypal','🅿️','PayPal'],['applepay','🍎','Apple Pay'],['crypto','₿','Crypto']].map(([val,icon,label]) => (
                  <div key={val} className={`payment-opt ${payment.method === val ? 'selected' : ''}`}
                    onClick={() => setPayment(p => ({ ...p, method: val }))}>
                    <span>{icon}</span><span>{label}</span>
                  </div>
                ))}
              </div>

              {payment.method === 'card' && (
                <>
                  {payInput('Name on Card',  'nameOnCard', 'text', 'John Doe')}
                  {payInput('Card Number',   'cardNumber', 'text', '4242 4242 4242 4242')}
                  <div className="form-row">
                    {payInput('Expiry', 'expiry', 'text', 'MM / YY')}
                    {payInput('CVV',    'cvv',    'text', '•••')}
                  </div>
                </>
              )}

              <div className="promo-row">
                <input placeholder="Promo code" value={promoCode} onChange={e => setPromoCode(e.target.value)} />
                <button className="btn-outline" onClick={handleApplyPromo}>Apply</button>
              </div>
              {promoMsg && <p style={{ color: discount ? '#52c98a' : '#e05252', fontSize: '.85rem' }}>{promoMsg}</p>}

              <div className="btn-row">
                <button className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
                <button className="btn-primary" onClick={() => setStep(3)}>Review Order →</button>
              </div>
            </div>
          )}

          {/* Step 3: Review + Place */}
          {step === 3 && (
            <div className="checkout-card">
              <h2>Review Your Order</h2>

              <div className="review-section">
                <h4>Shipping to:</h4>
                <p>{shipping.firstName} {shipping.lastName}</p>
                <p>{shipping.street}, {shipping.city}, {shipping.zip}</p>
                <p>{shipping.country} · {shipping.phone}</p>
              </div>

              <div className="review-section">
                <h4>Payment:</h4>
                <p>{payment.method === 'card' ? `💳 Card ending in ${payment.cardNumber.slice(-4) || '****'}` : payment.method}</p>
              </div>

              <div className="review-section">
                <h4>Items ({cart?.itemCount}):</h4>
                {cart?.items?.map(item => (
                  <div key={item._id} className="review-item">
                    <span>{item.product?.emoji} {item.product?.name} × {item.qty}</span>
                    <span>${(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="btn-row">
                <button className="btn-secondary" onClick={() => setStep(2)}>← Back</button>
                <button className="btn-primary btn-place" onClick={handlePlaceOrder} disabled={submitting}>
                  {submitting ? 'Placing Order...' : `Place Order · $${total}`}
                </button>
              </div>

              <p style={{ textAlign: 'center', fontSize: '.78rem', color: '#8a8799', marginTop: '1rem' }}>
                🔒 256-bit SSL encrypted checkout · 30-day free returns
              </p>
            </div>
          )}
        </div>

        <OrderSummary />
      </div>
    </div>
  );
}
