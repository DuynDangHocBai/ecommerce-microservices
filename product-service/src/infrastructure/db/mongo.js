const mongoose = require('mongoose');

async function connectMongo() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:37018/product_db';
  try {
    await mongoose.connect(uri);
    console.log('[product-service] Connected to MongoDB at', uri);
  } catch (err) {
    console.error('[product-service] MongoDB connection error:', err.message);
    throw err;
  }
}

module.exports = {
  connectMongo,
  mongoose
};
