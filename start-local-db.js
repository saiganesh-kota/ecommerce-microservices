const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Keep mongoServer in a global scope to prevent GC
let mongoServer;

async function start() {
  try {
    console.log('⏳ Starting in-memory MongoDB...');
    mongoServer = await MongoMemoryServer.create({
      instance: { port: 27017 }
    });
    
    const uri = mongoServer.getUri();
    const finalUri = uri + 'shopwave';
    console.log(`✅ MongoDB Memory Server active at: ${finalUri}`);
    
    process.env.MONGO_URI = finalUri;
    console.log(`📍 process.env.MONGO_URI set to: ${process.env.MONGO_URI}`);
    
    console.log('🌱 Seeding database...');
    const seed = require('./config/seed');
    await mongoose.connect(finalUri);
    console.log('🔗 Seeder connected to DB.');
    await seed();
    console.log('✅ Seeding complete.');
    
    // Explicitly don't disconnect so mongoose doesn't have to reconnect in server.js
    // though server.js will call connect again, which is usually fine with Mongoose.

    console.log('🚀 Finalizing backend startup...');
    require('./server');
  } catch (err) {
    console.error('❌ Failed to start local development environment:', err);
    process.exit(1);
  }
}

start();
