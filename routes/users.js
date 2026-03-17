const router = require('express').Router();
const User   = require('../models/User');
const { protect } = require('../middleware/auth');

// ─── PUT /api/users/profile ───────────────────────────────────────────────────
router.put('/profile', protect, async (req, res) => {
  try {
    const { firstName, lastName, phone, notifications } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { firstName, lastName, phone, notifications },
      { new: true, runValidators: true }
    );
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── POST /api/users/wishlist/:productId ──────────────────────────────────────
router.post('/wishlist/:productId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const pid  = req.params.productId;
    const idx  = user.wishlist.indexOf(pid);
    if (idx > -1) {
      user.wishlist.splice(idx, 1);
    } else {
      user.wishlist.push(pid);
    }
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, wishlist: user.wishlist });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/users/wishlist ──────────────────────────────────────────────────
router.get('/wishlist', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');
    res.json({ success: true, wishlist: user.wishlist });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/users/addresses ────────────────────────────────────────────────
router.post('/addresses', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (req.body.isDefault) user.addresses.forEach(a => (a.isDefault = false));
    user.addresses.push(req.body);
    await user.save({ validateBeforeSave: false });
    res.status(201).json({ success: true, addresses: user.addresses });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
