function loggingMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const uid = req.user && req.user.uid !== undefined ? req.user.uid : '-';
    console.log(`[gateway] ${req.requestId} ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms uid=${uid}`);
  });

  next();
}

module.exports = loggingMiddleware;
