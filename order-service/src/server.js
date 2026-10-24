require('dotenv').config();
const app = require('./app');
const prisma = require('./infrastructure/db/prisma');
const outboxPublisher = require('./application/outbox.publisher');

const PORT = process.env.PORT || 4104;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[order-service] HTTP Server running on port ${PORT}`);
  // Start Outbox Publisher background worker
  outboxPublisher.start().catch(err => {
    console.error('[order-service] Failed to start outbox publisher:', err.message);
  });
});

const gracefulShutdown = async (signal) => {
  console.log(`[order-service] Received ${signal}, closing server...`);
  try {
    await outboxPublisher.stop();
  } catch (err) {
    console.warn('[order-service] Error stopping outbox publisher:', err.message);
  }

  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log('[order-service] Prisma disconnected. Process exiting.');
      process.exit(0);
    } catch (err) {
      console.error('[order-service] Error during graceful shutdown:', err);
      process.exit(1);
    }
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
