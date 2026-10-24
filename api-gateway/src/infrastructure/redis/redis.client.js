const Redis = require('ioredis');
const config = require('../../config/env');

const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
  enableOfflineQueue: true
});

redis.on('connect', () => {
  console.log('[gateway] Connected to Redis at', config.redisUrl);
});

redis.on('error', (err) => {
  console.warn('[gateway] Redis connection warning:', err.message);
});

module.exports = redis;
