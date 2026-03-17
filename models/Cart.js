const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  qty:     { type: Number, required: true, default: 1 },
  price:   { type: Number, required: true },
  variant: { type: mongoose.Schema.Types.Mixed }
});

const cartSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items:     [cartItemSchema],
  promoCode: { type: String, default: null },
  discount:  { type: Number, default: 0 }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

cartSchema.virtual('subtotal').get(function() {
  const total = this.items.reduce((acc, item) => acc + (item.price * item.qty), 0);
  return total - (total * (this.discount || 0));
});

cartSchema.virtual('itemCount').get(function() {
  return this.items.reduce((acc, item) => acc + item.qty, 0);
});

module.exports = mongoose.model('Cart', cartSchema);
