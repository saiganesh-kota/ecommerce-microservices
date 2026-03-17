const mongoose = require('mongoose');
const bcrypt    = require('bcryptjs');
require('dotenv').config({ path: '../.env' });

const User    = require('../models/User');
const Product = require('../models/Product');
const Order   = require('../models/Order');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shopwave';

const users = [
  { firstName: 'Admin', lastName: 'User',  email: 'admin@shopwave.com', password: 'admin123', role: 'admin' },
  { firstName: 'Alex',  lastName: 'Johnson', email: 'alex@example.com', password: 'user123', role: 'user' },
  { firstName: 'Sarah', lastName: 'Kim',   email: 'sarah@example.com', password: 'user123', role: 'user' },
];

const products = [
  // Electronics
  { name: '4K Webcam', category: 'Electronics', price: 119, comparePrice: 149, emoji: '📷', stock: 34, badge: 'Sale', rating: 4.5, numReviews: 677, description: 'Sony sensor with autofocus, HDR, built-in mic. Works with all major video platforms.', tags: ['camera', 'streaming', '4k'], brand: 'TechBrand' },
  { name: 'Noise Cancelling Headphones', category: 'Electronics', price: 299, emoji: '🎧', stock: 15, isFeatured: true, rating: 4.9, numReviews: 1205, description: 'Industry-leading noise cancellation with personalized sound settings.', tags: ['audio', 'wireless'], brand: 'Sony' },
  { name: 'Ultra-HD Smart TV', category: 'Electronics', price: 1200, comparePrice: 1500, emoji: '📺', stock: 10, badge: 'Premium', isFeatured: true, rating: 4.8, numReviews: 450, description: 'Experience vivid colors and stunning clarity with our 4K Ultra-HD display.', tags: ['tv', 'home-theater'], brand: 'LG' },
  { name: 'Gaming Mouse', category: 'Electronics', price: 79, emoji: '🖱️', stock: 50, rating: 4.7, numReviews: 890, description: 'Ultra-lightweight gaming mouse with precision sensor and RGB lighting.', tags: ['gaming', 'pc'], brand: 'Razer' },
  { name: 'Mechanical Keyboard', category: 'Electronics', price: 159, emoji: '⌨️', stock: 25, badge: 'New', rating: 4.8, numReviews: 320, description: 'Tactile mechanical switches with customizable backlighting.', tags: ['gaming', 'pc'], brand: 'Corsair' },
  
  // Fashion
  { name: 'Cotton T-Shirt', category: 'Fashion', price: 25, emoji: '👕', stock: 100, rating: 4.4, numReviews: 500, description: 'Soft, breathable 100% cotton t-shirt. Available in multiple colors.', tags: ['clothing', 'casual'], brand: 'H&M' },
  { name: 'Denim Jeans', category: 'Fashion', price: 60, emoji: '👖', stock: 50, rating: 4.5, numReviews: 300, description: 'Classic straight-leg denim jeans for a timeless look.', tags: ['clothing', 'denim'], brand: 'Levis' },
  { name: 'Canvas Tote Bag', category: 'Fashion', price: 15, emoji: '👜', stock: 200, rating: 4.3, numReviews: 150, description: 'Durable canvas tote bag for all your shopping needs.', tags: ['accessories', 'sustainable'], brand: 'EcoWrap' },
  { name: 'Leather Jacket', category: 'Fashion', price: 199, emoji: '🧥', stock: 12, badge: 'Hot', isFeatured: true, rating: 4.9, numReviews: 85, description: 'Genuine leather jacket inspired by classic rider styles.', tags: ['clothing', 'outerwear'], brand: 'Zara' },
  { name: 'Sunglasses', category: 'Fashion', price: 120, emoji: '🕶️', stock: 45, rating: 4.6, numReviews: 210, description: 'Polarized lenses with a stylish aviator frame.', tags: ['accessories', 'summer'], brand: 'RayBan' },

  // Home
  { name: 'Stainless Steel Water Bottle', category: 'Home', price: 30, emoji: '🍶', stock: 80, rating: 4.7, numReviews: 600, description: 'Vacuum-insulated water bottle that keeps drinks cold for 24 hours.', tags: ['kitchen', 'portable'], brand: 'HydroFlask' },
  { name: 'Ceramic Mugs (Set of 4)', category: 'Home', price: 40, emoji: '☕', stock: 30, rating: 4.6, numReviews: 250, description: 'Elegant ceramic mugs with a matte finish. Perfect for your morning coffee.', tags: ['kitchen', 'home-decor'], brand: 'TableTop' },
  { name: 'Aromatic Candle', category: 'Home', price: 18, emoji: '🕯️', stock: 150, rating: 4.8, numReviews: 420, description: 'Lavender-scented soy candle for a relaxing atmosphere.', tags: ['decor', 'fragrance'], brand: 'Yankee' },
  { name: 'Comfort Pillows', category: 'Home', price: 55, emoji: '🛌', stock: 40, badge: 'Sale', rating: 4.5, numReviews: 180, description: 'Memory foam pillows for a perfect night\'s sleep.', tags: ['bedroom', 'comfort'], brand: 'Tempur' },
  { name: 'Smart Bulb Kit', category: 'Home', price: 89, emoji: '💡', stock: 22, rating: 4.4, numReviews: 95, description: 'Wi-Fi enabled bulbs that change color and brightness via app.', tags: ['smart-home', 'lighting'], brand: 'Philips' },

  // Sports
  { name: 'Dumbbell Set (5-25 lbs)', category: 'Sports', price: 150, emoji: '🏋️', stock: 15, rating: 4.8, numReviews: 400, description: 'High-quality cast iron dumbbells for your home gym.', tags: ['fitness', 'strength'], brand: 'Rogue' },
  { name: 'Mountain Bike', category: 'Sports', price: 800, emoji: '🚲', stock: 5, isFeatured: true, rating: 4.7, numReviews: 100, description: 'Rugged mountain bike with 21 speeds and front suspension.', tags: ['cycling', 'outdoor'], brand: 'Giant' },
  { name: 'Yoga Mat', category: 'Sports', price: 45, emoji: '🧘', stock: 65, rating: 4.6, numReviews: 540, description: 'Extra-thick non-slip yoga mat for maximum comfort.', tags: ['fitness', 'yoga'], brand: 'Lulu' },
  { name: 'Soccer Ball', category: 'Sports', price: 28, emoji: '⚽', stock: 90, rating: 4.5, numReviews: 220, description: 'Professional-grade soccer ball for training and matches.', tags: ['sports', 'ball'], brand: 'Adidas' },
  { name: 'Tennis Racket', category: 'Sports', price: 180, emoji: '🎾', stock: 18, badge: 'Premium', rating: 4.7, numReviews: 110, description: 'Lightweight graphite racket for precision and power.', tags: ['sports', 'tennis'], brand: 'Wilson' },

  // Beauty
  { name: 'Moisturizing Cream', category: 'Beauty', price: 20, emoji: '🧴', stock: 150, rating: 4.6, numReviews: 800, description: 'Intensive hydration for smooth and healthy-looking skin.', tags: ['skincare', 'face'], brand: 'Cetaphil' },
  { name: 'Lip Balm (Pack of 3)', category: 'Beauty', price: 10, emoji: '💄', stock: 300, rating: 4.5, numReviews: 1200, description: 'Soothing lip balm with beeswax and vitamin E.', tags: ['skincare', 'daily'], brand: 'BurtBee' },
  { name: 'Face Mask (10 Pack)', category: 'Beauty', price: 35, emoji: '🎭', stock: 85, rating: 4.4, numReviews: 310, description: 'Rejuvenating sheet masks with hyaluronic acid.', tags: ['skincare', 'spa'], brand: 'Laneige' },
  { name: 'Luxury Perfume', category: 'Beauty', price: 125, emoji: '✨', stock: 20, badge: 'Premium', isFeatured: true, rating: 4.9, numReviews: 140, description: 'Exquisite fragrance with notes of jasmine and sandalwood.', tags: ['fragrance', 'luxury'], brand: 'Chanel' },
  { name: 'Electric Toothbrush', category: 'Beauty', price: 95, emoji: '🪥', stock: 40, rating: 4.7, numReviews: 680, description: 'Sonic cleaning technology for a brighter smile.', tags: ['health', 'hygiene'], brand: 'OralB' },
];

async function seed() {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
      console.log('✅ Connected to MongoDB');
    }

    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    console.log('🗑  Collections cleared');

    const createdUsers = await User.insertMany(users);
    console.log(`👤 Created ${createdUsers.length} users`);

    console.log('📦 Seeding products...');
    const createdProducts = [];
    for (const pData of products) {
      const p = new Product(pData);
      await p.save();
      createdProducts.push(p);
    }
    console.log(`✅ Created ${createdProducts.length} products`);

    console.log('\n✅ Database seeded successfully!');
    console.log('─────────────────────────────────────');
    console.log('Admin:  admin@shopwave.com / admin123');
    console.log('User:   alex@example.com   / user123');
    console.log('─────────────────────────────────────');

    if (require.main === module) process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    if (require.main === module) process.exit(1);
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;
