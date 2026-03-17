const router  = require('express').Router();
const crypto  = require('crypto');
const User    = require('../models/User');
const { generateToken, generateRefreshToken, protect } = require('../middleware/auth');

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({ success: false, message: 'All fields required' });

    if (await User.findOne({ email }))
      return res.status(400).json({ success: false, message: 'Email already registered' });

    const user = await User.create({ firstName, lastName, email, password });
    const token        = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshTokens.push(refreshToken);
    await user.save({ validateBeforeSave: false });

    res.status(201).json({
      success: true,
      token,
      refreshToken,
      user: { id: user._id, firstName, lastName, email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    user.lastLogin = Date.now();
    const token        = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshTokens.push(refreshToken);
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      token,
      refreshToken,
      user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'No refresh token' });

    const jwt  = require('jsonwebtoken');
    const data = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(data.id);

    if (!user || !user.refreshTokens.includes(refreshToken))
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });

    const newToken        = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    user.refreshTokens    = user.refreshTokens.filter(t => t !== refreshToken);
    user.refreshTokens.push(newRefreshToken);
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, token: newToken, refreshToken: newRefreshToken });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Refresh token expired' });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', protect, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    req.user.refreshTokens = req.user.refreshTokens.filter(t => t !== refreshToken);
    await req.user.save({ validateBeforeSave: false });
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ success: false, message: 'No account with that email' });

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    // TODO: Send email via nodemailer
    console.log('Reset URL:', resetUrl); // dev only

    res.json({ success: true, message: 'Password reset email sent' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/auth/reset-password/:token ─────────────────────────────────────
router.put('/reset-password/:token', async (req, res) => {
  try {
    const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user   = await User.findOne({ resetPasswordToken: hashed, resetPasswordExpire: { $gt: Date.now() } });

    if (!user) return res.status(400).json({ success: false, message: 'Token invalid or expired' });

    user.password            = req.body.password;
    user.resetPasswordToken  = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', protect, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
