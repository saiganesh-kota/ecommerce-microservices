const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');

const addressSchema = new mongoose.Schema({
  label:    { type: String, default: 'Home' },
  street:   { type: String, required: true },
  city:     { type: String, required: true },
  state:    { type: String, required: true },
  zip:      { type: String, required: true },
  country:  { type: String, required: true },
  isDefault:{ type: Boolean, default: false },
});

const userSchema = new mongoose.Schema(
  {
    firstName:  { type: String, required: true, trim: true },
    lastName:   { type: String, required: true, trim: true },
    email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:   { type: String, required: true, minlength: 6, select: false },
    phone:      { type: String },
    avatar:     { type: String, default: '' },
    role:       { type: String, enum: ['user', 'admin'], default: 'user' },
    isVerified: { type: Boolean, default: false },
    addresses:  [addressSchema],
    wishlist:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    // OAuth
    googleId:   { type: String },
    facebookId: { type: String },
    // Tokens
    resetPasswordToken:   String,
    resetPasswordExpire:  Date,
    verifyEmailToken:     String,
    refreshTokens:        [String],
    // Preferences
    notifications: {
      orderUpdates:   { type: Boolean, default: true },
      promotions:     { type: Boolean, default: true },
      newArrivals:    { type: Boolean, default: false },
    },
    lastLogin: Date,
  },
  { timestamps: true }
);

// ─── Virtual: full name ───────────────────────────────────────────────────────
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// ─── Hash password before save ────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Compare passwords ────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// ─── Generate reset token ─────────────────────────────────────────────────────
userSchema.methods.getResetPasswordToken = function () {
  const token = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken  = crypto.createHash('sha256').update(token).digest('hex');
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 min
  return token;
};

module.exports = mongoose.model('User', userSchema);
