const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:37019/shipment_db';
  try {
    await mongoose.connect(uri);
    console.log('[shipment-service] Connected to MongoDB at', uri);
  } catch (err) {
    console.error('[shipment-service] MongoDB connection error:', err.message);
    throw err;
  }
}

async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log('[shipment-service] MongoDB disconnected');
  } catch (err) {
    console.error('[shipment-service] MongoDB disconnect error:', err.message);
  }
}

function checkDBHealth() {
  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  return mongoose.connection.readyState === 1 ? 'UP' : 'DOWN';
}

module.exports = {
  connectDB,
  disconnectDB,
  checkDBHealth,
  mongoose
};
