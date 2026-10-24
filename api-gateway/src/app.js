const express = require('express');
const requestIdMiddleware = require('./interfaces/http/middlewares/request-id.middleware');
const loggingMiddleware = require('./interfaces/http/middlewares/logging.middleware');
const authMiddleware = require('./interfaces/http/middlewares/auth.middleware');
const roleMiddleware = require('./interfaces/http/middlewares/role.middleware');
const { globalLimiter, authLimiter } = require('./interfaces/http/middlewares/rate-limit.middleware');
const { productCacheMiddleware } = require('./interfaces/http/middlewares/cache.middleware');
const healthRoutes = require('./interfaces/http/routes/health.routes');
const {
  authProxy,
  customerProxy,
  productProxy,
  orderProxy,
  shipmentProxy
} = require('./interfaces/http/routes/proxy.routes');

const app = express();

// 1. Assign Request ID and Setup Structured Logging
app.use(requestIdMiddleware);
app.use(loggingMiddleware);

// 2. Health Check (Public endpoint)
app.use('/api/health', healthRoutes);

// 3. Rate Limiting
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use(globalLimiter);

// 4. Authentication & Header Sanitization
app.use(authMiddleware);

// 5. Role-based Authorization
app.use(roleMiddleware);

// 6. Product Cache Look-up
app.use(productCacheMiddleware);

// 7. Microservice Reverse Proxies (No express.json before proxies)
app.use(authProxy);
app.use(customerProxy);
app.use(productProxy);
app.use(orderProxy);
app.use(shipmentProxy);

// 8. 404 Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found'
  });
});

// 9. Global Error Handler
app.use((err, req, res, next) => {
  console.error('[gateway] Uncaught error:', err.message);
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = app;
