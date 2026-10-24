const { createProxyMiddleware } = require('http-proxy-middleware');
const config = require('../../../config/env');
const { proxyCacheInterceptor } = require('../middlewares/cache.middleware');

function createServiceProxy(target, withCacheInterceptor = false) {
  const options = {
    target,
    changeOrigin: true,
    on: {
      error: (err, req, res) => {
        if (!res.headersSent) {
          res.status(503).json({ error: 'Service unavailable' });
        }
      },
      proxyReq: (proxyReq, req, res) => {
        // Forward X-Request-Id
        if (req.requestId) {
          proxyReq.setHeader('x-request-id', req.requestId);
        }

        // Forward authenticated identity headers, strip spoofed ones if unauthenticated
        if (req.user && req.user.uid !== undefined) {
          proxyReq.setHeader('x-user-id', String(req.user.uid));
          proxyReq.setHeader('x-user-role', String(req.user.role));
        } else {
          proxyReq.removeHeader('x-user-id');
          proxyReq.removeHeader('x-user-role');
        }
      }
    }
  };

  if (withCacheInterceptor) {
    options.selfHandleResponse = true;
    options.on.proxyRes = proxyCacheInterceptor;
  }

  return createProxyMiddleware(options);
}

const authProxy = createProxyMiddleware({
  pathFilter: (path) => path.startsWith('/api/auth'),
  target: config.services.auth,
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      if (!res.headersSent) {
        res.status(503).json({ error: 'Service unavailable' });
      }
    },
    proxyReq: (proxyReq, req, res) => {
      if (req.requestId) {
        proxyReq.setHeader('x-request-id', req.requestId);
      }
      proxyReq.removeHeader('x-user-id');
      proxyReq.removeHeader('x-user-role');
    }
  }
});

const customerProxy = createProxyMiddleware({
  pathFilter: (path) => path.startsWith('/api/customers'),
  target: config.services.customer,
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      if (!res.headersSent) {
        res.status(503).json({ error: 'Service unavailable' });
      }
    },
    proxyReq: (proxyReq, req, res) => {
      if (req.requestId) {
        proxyReq.setHeader('x-request-id', req.requestId);
      }
      if (req.user && req.user.uid !== undefined) {
        proxyReq.setHeader('x-user-id', String(req.user.uid));
        proxyReq.setHeader('x-user-role', String(req.user.role));
      } else {
        proxyReq.removeHeader('x-user-id');
        proxyReq.removeHeader('x-user-role');
      }
    }
  }
});

const productProxy = createProxyMiddleware({
  pathFilter: (path) => path.startsWith('/api/products'),
  target: config.services.product,
  changeOrigin: true,
  selfHandleResponse: true,
  on: {
    error: (err, req, res) => {
      if (!res.headersSent) {
        res.status(503).json({ error: 'Service unavailable' });
      }
    },
    proxyReq: (proxyReq, req, res) => {
      if (req.requestId) {
        proxyReq.setHeader('x-request-id', req.requestId);
      }
      if (req.user && req.user.uid !== undefined) {
        proxyReq.setHeader('x-user-id', String(req.user.uid));
        proxyReq.setHeader('x-user-role', String(req.user.role));
      } else {
        proxyReq.removeHeader('x-user-id');
        proxyReq.removeHeader('x-user-role');
      }
    },
    proxyRes: proxyCacheInterceptor
  }
});

const orderProxy = createProxyMiddleware({
  pathFilter: (path) => path.startsWith('/api/orders'),
  target: config.services.order,
  changeOrigin: true,
  selfHandleResponse: true,
  on: {
    error: (err, req, res) => {
      if (!res.headersSent) {
        res.status(503).json({ error: 'Service unavailable' });
      }
    },
    proxyReq: (proxyReq, req, res) => {
      if (req.requestId) {
        proxyReq.setHeader('x-request-id', req.requestId);
      }
      if (req.user && req.user.uid !== undefined) {
        proxyReq.setHeader('x-user-id', String(req.user.uid));
        proxyReq.setHeader('x-user-role', String(req.user.role));
      } else {
        proxyReq.removeHeader('x-user-id');
        proxyReq.removeHeader('x-user-role');
      }
    },
    proxyRes: proxyCacheInterceptor
  }
});

const shipmentProxy = createProxyMiddleware({
  pathFilter: (path) => path.startsWith('/api/shipments'),
  target: config.services.shipment,
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      if (!res.headersSent) {
        res.status(503).json({ error: 'Service unavailable' });
      }
    },
    proxyReq: (proxyReq, req, res) => {
      if (req.requestId) {
        proxyReq.setHeader('x-request-id', req.requestId);
      }
      if (req.user && req.user.uid !== undefined) {
        proxyReq.setHeader('x-user-id', String(req.user.uid));
        proxyReq.setHeader('x-user-role', String(req.user.role));
      } else {
        proxyReq.removeHeader('x-user-id');
        proxyReq.removeHeader('x-user-role');
      }
    }
  }
});

module.exports = {
  authProxy,
  customerProxy,
  productProxy,
  orderProxy,
  shipmentProxy
};
