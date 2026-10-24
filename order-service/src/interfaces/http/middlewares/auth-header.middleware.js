function authHeaderMiddleware(req, res, next) {
  const userIdHeader = req.headers['x-user-id'];
  if (!userIdHeader) {
    return res.status(401).json({
      error: 'Unauthorized: Missing user header'
    });
  }

  const uid = parseInt(userIdHeader, 10);
  if (isNaN(uid) || uid <= 0) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid user header'
    });
  }

  req.user = {
    uid,
    role: (req.headers['x-user-role'] || 'CUSTOMER').toUpperCase()
  };

  next();
}

module.exports = authHeaderMiddleware;
