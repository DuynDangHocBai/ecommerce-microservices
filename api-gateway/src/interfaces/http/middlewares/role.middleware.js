function roleMiddleware(req, res, next) {
  const path = req.originalUrl.split('?')[0];
  const method = req.method.toUpperCase();
  const role = req.user ? req.user.role : null;

  // 1. POST/PUT/DELETE /api/products/** : only ADMIN
  if (path.startsWith('/api/products') && ['POST', 'PUT', 'DELETE'].includes(method)) {
    if (role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Forbidden: Admin role required'
      });
    }
  }

  // 2. PATCH /api/shipments/**/status : only SHIPMENT_STAFF or ADMIN
  if (path.startsWith('/api/shipments') && path.endsWith('/status') && method === 'PATCH') {
    if (role !== 'ADMIN' && role !== 'SHIPMENT_STAFF') {
      return res.status(403).json({
        error: 'Forbidden: Shipment staff or Admin role required'
      });
    }
  }

  // 3. POST /api/orders : only CUSTOMER or ADMIN
  if ((path === '/api/orders' || path === '/api/orders/') && method === 'POST') {
    if (role !== 'ADMIN' && role !== 'CUSTOMER') {
      return res.status(403).json({
        error: 'Forbidden: Customer or Admin role required'
      });
    }
  }

  next();
}

module.exports = roleMiddleware;
