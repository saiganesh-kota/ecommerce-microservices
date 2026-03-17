const router  = require('express').Router();
const Order   = require('../models/Order');
const Product = require('../models/Product');
const Cart    = require('../models/Cart');
const { protect, admin } = require('../middleware/auth');

const SHIPPING_THRESHOLD = 50;
const SHIPPING_COST      = 9.99;
const TAX_RATE           = 0.08;

const PROMO_CODES = {
  WELCOME10: 0.10,
  SAVE20:    0.20,
  SUMMER15:  0.15,
};

// ─── POST /api/orders ──────────────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { shippingAddress, paymentMethod, promoCode } = req.body;

    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart || !cart.items.length)
      return res.status(400).json({ success: false, message: 'Cart is empty' });

    // Validate stock
    for (const item of cart.items) {
      if (!item.product || item.product.stock < item.qty)
        return res.status(400).json({ success: false, message: `Insufficient stock: ${item.product?.name}` });
    }

    const itemsPrice    = +cart.subtotal;
    const shippingPrice = itemsPrice >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const taxPrice      = +(itemsPrice * TAX_RATE).toFixed(2);

    let discountPrice = 0;
    if (promoCode && PROMO_CODES[promoCode.toUpperCase()]) {
      discountPrice = +(itemsPrice * PROMO_CODES[promoCode.toUpperCase()]).toFixed(2);
    }

    const totalPrice = +(itemsPrice + shippingPrice + taxPrice - discountPrice).toFixed(2);

    const order = await Order.create({
      user:     req.user._id,
      items:    cart.items.map(i => ({ product: i.product._id, name: i.product.name, image: i.product.images?.[0]?.url, price: i.price, qty: i.qty, variant: i.variant })),
      shippingAddress,
      paymentMethod,
      promoCode,
      itemsPrice,
      shippingPrice,
      taxPrice,
      discountPrice,
      totalPrice,
    });

    // Decrement stock
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.qty, soldCount: item.qty },
      });
    }

    // Clear cart
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [], promoCode: null, discount: 0 });

    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── GET /api/orders/my ───────────────────────────────────────────────────────
router.get('/my', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .populate('items.product', 'name images emoji');
    const total = await Order.countDocuments({ user: req.user._id });
    res.json({ success: true, orders, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'firstName lastName email');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Access denied' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/orders/:id/pay ──────────────────────────────────────────────────
router.put('/:id/pay', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.isPaid       = true;
    order.paidAt       = Date.now();
    order.status       = 'confirmed';
    order.paymentResult = req.body;
    order.statusHistory.push({ status: 'confirmed', note: 'Payment received' });
    await order.save();

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/orders/:id/status (admin) ───────────────────────────────────────
router.put('/:id/status', protect, admin, async (req, res) => {
  try {
    const { status, note, trackingNumber, carrier } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (carrier)        order.carrier = carrier;
    if (status === 'delivered') { order.isDelivered = true; order.deliveredAt = Date.now(); }
    order.statusHistory.push({ status, note: note || `Status updated to ${status}` });
    await order.save();

    res.json({ success: true, order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── GET /api/orders (admin) ──────────────────────────────────────────────────
router.get('/', protect, admin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = status ? { status } : {};
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .populate('user', 'firstName lastName email');
    const total = await Order.countDocuments(filter);
    res.json({ success: true, orders, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
