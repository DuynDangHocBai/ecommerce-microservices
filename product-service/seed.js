require('dotenv').config();
const { connectMongo, mongoose } = require('./src/infrastructure/db/mongo');
const Product = require('./src/infrastructure/models/product.model');
const Counter = require('./src/infrastructure/models/counter.model');

async function seed() {
  console.log('[product-service] Seeding database...');
  await connectMongo();

  const products = [
    { pid: 1, pname: 'Laptop', price: 1500, quantity: 10 },
    { pid: 2, pname: 'Mouse', price: 25, quantity: 100 },
    { pid: 3, pname: 'Keyboard', price: 45, quantity: 50 }
  ];

  for (const p of products) {
    await Product.findOneAndUpdate(
      { pid: p.pid },
      { $set: { pname: p.pname, price: p.price, quantity: p.quantity } },
      { upsert: true, new: true }
    );
    console.log(`[product-service] Upserted product: pid ${p.pid} - ${p.pname} (qty: ${p.quantity})`);
  }

  // Update counters so next auto-generated pid is 4
  await Counter.findByIdAndUpdate(
    'pid',
    { $set: { seq: 3 } },
    { upsert: true, new: true }
  );
  console.log('[product-service] Updated counter to 3 (next pid will be 4)');

  console.log('[product-service] Seeding completed successfully.');
  await mongoose.connection.close();
}

seed().catch((err) => {
  console.error('[product-service] Seed failed:', err);
  process.exit(1);
});
