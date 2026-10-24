require('dotenv').config();
const app = require('./app');
const { connectDB, disconnectDB } = require('./infrastructure/db/mongoose');
const orderConsumer = require('./interfaces/messaging/order.consumer');

const PORT = process.env.PORT || 4105;

async function startServer() {
  try {
    await connectDB();

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[shipment-service] HTTP Server running on port ${PORT}`);
      // Start Kafka consumer
      orderConsumer.start().catch(err => {
        console.error('[shipment-service] Failed to start order consumer:', err.message);
      });
    });

    const gracefulShutdown = async (signal) => {
      console.log(`[shipment-service] Received ${signal}, closing server...`);
      try {
        await orderConsumer.stop();
      } catch (err) {
        console.warn('[shipment-service] Error stopping consumer:', err.message);
      }

      server.close(async () => {
        try {
          await disconnectDB();
          console.log('[shipment-service] Process exiting gracefully.');
          process.exit(0);
        } catch (err) {
          console.error('[shipment-service] Error during DB disconnect:', err.message);
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (err) {
    console.error('[shipment-service] Fatal startup error:', err.message);
    process.exit(1);
  }
}

startServer();
