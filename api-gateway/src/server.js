const app = require('./app');
const config = require('./config/env');
const redis = require('./infrastructure/redis/redis.client');

const server = app.listen(config.port, () => {
  console.log(`[gateway] API Gateway server running on port ${config.port}`);
});

function shutdown() {
  console.log('[gateway] Shutting down API Gateway...');
  server.close(() => {
    console.log('[gateway] HTTP server closed');
  });
  redis.quit().then(() => {
    console.log('[gateway] Redis connection closed');
  }).catch((err) => {
    console.warn('[gateway] Redis close warning:', err.message);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
