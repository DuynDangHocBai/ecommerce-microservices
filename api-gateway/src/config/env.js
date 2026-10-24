require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 4100,
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:4101',
    customer: process.env.CUSTOMER_SERVICE_URL || 'http://127.0.0.1:4102',
    product: process.env.PRODUCT_SERVICE_URL || 'http://127.0.0.1:4103',
    order: process.env.ORDER_SERVICE_URL || 'http://127.0.0.1:4104',
    shipment: process.env.SHIPMENT_SERVICE_URL || 'http://127.0.0.1:4105'
  },
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:16379',
  jwtSecret: process.env.JWT_SECRET || 'ecommerce_jwt_secret_key_auth_service_2026',
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 10
  },
  productCacheTtl: parseInt(process.env.PRODUCT_CACHE_TTL, 10) || 60,
  healthServices: (process.env.HEALTH_SERVICES || 'auth,customer,product').split(',').map(s => s.trim())
};
