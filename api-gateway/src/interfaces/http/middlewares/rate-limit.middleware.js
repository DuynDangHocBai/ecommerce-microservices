const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redis = require('../../../infrastructure/redis/redis.client');
const config = require('../../../config/env');

const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  limit: config.rateLimit.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  passOnStoreError: true,
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: 'rl:global:'
  }),
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests'
    });
  }
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: config.rateLimit.authMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  passOnStoreError: true,
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: 'rl:auth:'
  }),
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests'
    });
  }
});

module.exports = {
  globalLimiter,
  authLimiter
};
