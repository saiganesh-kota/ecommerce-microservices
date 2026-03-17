const router  = require('express').Router();
const Product = require('../models/Product');
const { protect, admin, optionalAuth } = require('../middleware/auth');

// ─── GET /api/products ────────────────────────────────────────────────────────
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, search, sort, minPrice, maxPrice, rating, page = 1, limit = 12, featured } = req.query;

    const query = { isActive: true };
    if (category)            query.category = category;
    if (featured === 'true') query.isFeatured = true;
    if (search)              query.$text = { $search: search };
    if (minPrice || maxPrice) query.price = {};
    if (minPrice) query.price.$gte = +minPrice;
    if (maxPrice) query.price.$lte = +maxPrice;
    if (rating)   query.rating = { $gte: +rating };

    const sortMap = {
      'price-asc':   { price: 1 },
      'price-desc':  { price: -1 },
      'rating':      { rating: -1 },
      'newest':      { createdAt: -1 },
      'bestselling': { soldCount: -1 },
      'name':        { name: 1 },
    };
    const sortBy = sortMap[sort] || { createdAt: -1 };

    const skip  = (+page - 1) * +limit;
    const total = await Product.countDocuments(query);
    const products = await Product.find(query).sort(sortBy).skip(skip).limit(+limit).lean();

    res.json({
      success: true,
      products,
      pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / +limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/products/categories ────────────────────────────────────────────
router.get('/categories', async (req, res) => {
  try {
    const cats = await Product.distinct('category', { isActive: true });
    res.json({ success: true, categories: cats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/products/:id ────────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('reviews.user', 'firstName lastName avatar');
    if (!product || !product.isActive)
      return res.status(404).json({ success: false, message: 'Product not found' });

    // Increment view count
    await Product.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });

    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/products (admin) ────────────────────────────────────────────────
router.post('/', protect, admin, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/products/:id (admin) ────────────────────────────────────────────
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/products/:id (admin) ─────────────────────────────────────────
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/products/:id/reviews ──────────────────────────────────────────
router.post('/:id/reviews', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const alreadyReviewed = product.reviews.find(r => r.user.toString() === req.user._id.toString());
    if (alreadyReviewed)
      return res.status(400).json({ success: false, message: 'Already reviewed' });

    product.reviews.push({ user: req.user._id, name: req.user.fullName, rating: +rating, comment });
    product.recalcRating();
    await product.save();

    res.status(201).json({ success: true, message: 'Review added' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
