const { responseInterceptor } = require('http-proxy-middleware');
const redis = require('../../../infrastructure/redis/redis.client');
const config = require('../../../config/env');

async function clearProductCache() {
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'cache:products:*', 'COUNT', 100);
      cursor = nextCursor;
      if (keys && keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    console.warn('[gateway] Redis clear product cache warning:', err.message);
  }
}

async function productCacheMiddleware(req, res, next) {
  if (req.method !== 'GET') {
    return next();
  }

  const path = req.originalUrl.split('?')[0];
  const isProductRoute = path === '/api/products' || /^\/api\/products\/\d+$/.test(path);
  if (!isProductRoute) {
    return next();
  }

  const cacheKey = `cache:products:${req.originalUrl}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(cached);
    }
  } catch (err) {
    console.warn('[gateway] Redis cache lookup warning:', err.message);
  }

  res.setHeader('X-Cache', 'MISS');
  next();
}

const proxyCacheInterceptor = responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
  const path = req.originalUrl.split('?')[0];
  const method = req.method.toUpperCase();
  const status = proxyRes.statusCode;

  // 1. Cache product GET requests if 200
  const isProductGet = method === 'GET' && (path === '/api/products' || /^\/api\/products\/\d+$/.test(path));
  if (isProductGet && status === 200) {
    const cacheKey = `cache:products:${req.originalUrl}`;
    try {
      const content = responseBuffer.toString('utf8');
      await redis.set(cacheKey, content, 'EX', config.productCacheTtl);
    } catch (err) {
      console.warn('[gateway] Redis cache save warning:', err.message);
    }
  }

  // 2. Invalidate product cache on mutations:
  // - POST/PUT/DELETE /api/products/** with 200/201
  // - POST /api/orders with 201
  const isProductMutation = path.startsWith('/api/products') && ['POST', 'PUT', 'DELETE'].includes(method) && [200, 201].includes(status);
  const isOrderCreated = path.startsWith('/api/orders') && method === 'POST' && status === 201;

  if (isProductMutation || isOrderCreated) {
    clearProductCache();
  }

  return responseBuffer;
});

module.exports = {
  productCacheMiddleware,
  proxyCacheInterceptor,
  clearProductCache
};
