const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name:    { type: String, required: true },
    rating:  { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    helpful: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const variantSchema = new mongoose.Schema({
  name:     String,          // e.g. "Color", "Size"
  options:  [String],        // e.g. ["Red", "Blue"]
  sku:      String,
  stock:    { type: Number, default: 0 },
  priceAdj: { type: Number, default: 0 }, // price adjustment
});

const productSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    slug:        { type: String, unique: true },
    description: { type: String, required: true },
    shortDesc:   { type: String },
    category:    { type: String, required: true, index: true },
    subcategory: { type: String },
    brand:       { type: String },
    tags:        [String],

    price:       { type: Number, required: true, min: 0 },
    comparePrice:{ type: Number },           // original/strike-through price
    costPrice:   { type: Number },           // for margin calculation

    images:      [{ url: String, alt: String, isPrimary: Boolean }],
    emoji:       { type: String, default: '📦' }, // fallback icon

    variants:    [variantSchema],
    stock:       { type: Number, default: 0, min: 0 },
    sku:         { type: String, unique: true, sparse: true },
    weight:      Number,  // grams, for shipping calc

    reviews:     [reviewSchema],
    rating:      { type: Number, default: 0 },
    numReviews:  { type: Number, default: 0 },

    isFeatured:  { type: Boolean, default: false },
    isActive:    { type: Boolean, default: true },
    badge:       { type: String, enum: ['New', 'Hot', 'Sale', 'Top', 'Premium', null], default: null },

    seoTitle:       String,
    seoDescription: String,

    soldCount:   { type: Number, default: 0 },
    viewCount:   { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// ─── Virtuals ─────────────────────────────────────────────────────────────────
productSchema.virtual('discountPct').get(function () {
  if (!this.comparePrice) return 0;
  return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
});
productSchema.virtual('inStock').get(function () {
  return this.stock > 0;
});

// ─── Auto-slug ────────────────────────────────────────────────────────────────
productSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

// ─── Recompute avg rating after review changes ────────────────────────────────
productSchema.methods.recalcRating = function () {
  if (!this.reviews.length) { this.rating = 0; this.numReviews = 0; return; }
  this.numReviews = this.reviews.length;
  this.rating = +(this.reviews.reduce((s, r) => s + r.rating, 0) / this.numReviews).toFixed(1);
};

// ─── Text search index ────────────────────────────────────────────────────────
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, price: 1, rating: -1 });

module.exports = mongoose.model('Product', productSchema);
