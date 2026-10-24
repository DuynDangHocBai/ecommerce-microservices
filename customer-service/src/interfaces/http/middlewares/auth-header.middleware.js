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

function authorizeCustomerAccess(req, res, next) {
  const targetUid = parseInt(req.params.uid, 10);
  if (isNaN(targetUid)) {
    return res.status(400).json({
      error: 'Invalid uid parameter'
    });
  }

  // ADMIN can access any profile
  if (req.user && req.user.role === 'ADMIN') {
    return next();
  }

  // Otherwise, users can only access their own profile
  if (req.user && req.user.uid === targetUid) {
    return next();
  }

  return res.status(403).json({
    error: 'Forbidden: You can only access your own customer profile'
  });
}

module.exports = {
  requireUserHeader,
  authorizeCustomerAccess
};
