function requireUserHeader(req, res, next) {
  const xUserId = req.headers['x-user-id'];
  const xUserRole = req.headers['x-user-role'];

  if (!xUserId) {
    return res.status(401).json({
      error: 'Unauthorized: Missing x-user-id header'
    });
  }

  const uid = parseInt(xUserId, 10);
  if (isNaN(uid)) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid x-user-id header'
    });
  }

  req.user = {
    uid,
    role: xUserRole || 'CUSTOMER'
  };

  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      error: 'Forbidden: Admin access required'
    });
  }
  next();
}

module.exports = {
  requireUserHeader,
  requireAdmin
};
