const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name:      { type: String, required: true },
  image:     String,
  price:     { type: Number, required: true },
  qty:       { type: Number, required: true, min: 1 },
  variant:   { name: String, value: String },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },
    user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items:       [orderItemSchema],

    shippingAddress: {
      firstName: String, lastName: String,
      street: String, city: String, state: String,
      zip: String, country: String, phone: String,
    },

    paymentMethod:  { type: String, required: true },
    paymentResult:  {
      id: String, status: String,
      updateTime: String, emailAddress: String,
    },
    isPaid:       { type: Boolean, default: false },
    paidAt:       Date,

    itemsPrice:   { type: Number, required: true },
    shippingPrice:{ type: Number, default: 0 },
    taxPrice:     { type: Number, required: true },
    discountPrice:{ type: Number, default: 0 },
    totalPrice:   { type: Number, required: true },

    promoCode:    String,

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
      default: 'pending',
    },

    trackingNumber: String,
    carrier:        String,

    isDelivered:  { type: Boolean, default: false },
    deliveredAt:  Date,

    notes:        String,

    statusHistory: [{
      status:    String,
      note:      String,
      timestamp: { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

// ─── Auto order number ────────────────────────────────────────────────────────
orderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments();
    this.orderNumber = `ORD-${String(count + 1001).padStart(6, '0')}`;
    this.statusHistory.push({ status: this.status, note: 'Order placed' });
  }
  next();
});

// ─── Virtual: subtotal ────────────────────────────────────────────────────────
orderSchema.virtual('itemCount').get(function () {
  return this.items.reduce((s, i) => s + i.qty, 0);
});

module.exports = mongoose.model('Order', orderSchema);
