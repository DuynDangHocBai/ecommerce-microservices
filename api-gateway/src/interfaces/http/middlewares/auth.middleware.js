const jwt = require('jsonwebtoken');
const config = require('../../../config/env');

function authMiddleware(req, res, next) {
  // Always sanitize headers to prevent header spoofing from external clients
  delete req.headers['x-user-id'];
  delete req.headers['x-user-role'];

  const path = req.path || req.originalUrl;

  // Bypass public routes: /api/auth/** and /api/health
  if (path.startsWith('/api/auth') || path === '/api/health') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Missing or invalid authorization header'
    });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized: Empty token'
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = {
      uid: decoded.sub,
      role: decoded.role
    };

    // Attach validated identity headers to forward downstream
    req.headers['x-user-id'] = String(decoded.sub);
    req.headers['x-user-role'] = String(decoded.role);

    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid or expired token'
    });
  }
}

module.exports = authMiddleware;
