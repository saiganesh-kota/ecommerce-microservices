const router  = require('express').Router();
const Cart    = require('../models/Cart');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

const PROMO_CODES = { WELCOME10: 0.10, SAVE20: 0.20, SUMMER15: 0.15 };

// ─── GET /api/cart ─────────────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product', 'name images emoji price stock');
    if (!cart) return res.json({ success: true, cart: { items: [], subtotal: 0, itemCount: 0 } });
    res.json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/cart ────────────────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { productId, qty = 1, variant } = req.body;

    const product = await Product.findById(productId);
    if (!product || !product.isActive)
      return res.status(404).json({ success: false, message: 'Product not found' });
    if (product.stock < qty)
      return res.status(400).json({ success: false, message: 'Insufficient stock' });

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });

    const existingIdx = cart.items.findIndex(
      i => i.product.toString() === productId && JSON.stringify(i.variant) === JSON.stringify(variant)
    );

    if (existingIdx > -1) {
      cart.items[existingIdx].qty += qty;
    } else {
      cart.items.push({ product: productId, qty, price: product.price, variant });
    }

    await cart.save();
    await cart.populate('items.product', 'name images emoji price stock');
    res.json({ success: true, cart });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/cart/:itemId ─────────────────────────────────────────────────────
router.put('/:itemId', protect, async (req, res) => {
  try {
    const { qty } = req.body;
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    const item = cart.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    if (qty <= 0) {
      item.deleteOne();
    } else {
      const product = await Product.findById(item.product);
      if (product.stock < qty) return res.status(400).json({ success: false, message: 'Insufficient stock' });
      item.qty = qty;
    }

    await cart.save();
    await cart.populate('items.product', 'name images emoji price stock');
    res.json({ success: true, cart });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/cart/:itemId ──────────────────────────────────────────────────
router.delete('/:itemId', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    cart.items = cart.items.filter(i => i._id.toString() !== req.params.itemId);
    await cart.save();
    await cart.populate('items.product', 'name images emoji price stock');
    res.json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/cart/promo ──────────────────────────────────────────────────────
router.post('/promo', protect, async (req, res) => {
  try {
    const { code } = req.body;
    const rate = PROMO_CODES[code?.toUpperCase()];
    if (!rate) return res.status(400).json({ success: false, message: 'Invalid promo code' });

    const cart = await Cart.findOne({ user: req.user._id });
    cart.promoCode = code.toUpperCase();
    cart.discount  = rate;
    await cart.save();

    res.json({ success: true, message: `${Math.round(rate * 100)}% discount applied!`, discount: rate });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/cart ──────────────────────────────────────────────────────────
router.delete('/', protect, async (req, res) => {
  try {
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [], promoCode: null, discount: 0 });
    res.json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
