function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (err.status >= 400 && err.status < 600 ? err.status : 500);
  const message = err.message || 'Internal server error';

  if (statusCode >= 500) {
    console.error(`[product-service] Internal Error: ${err.message}`, err.stack);
  } else {
    console.warn(`[product-service] Request Warning: ${statusCode} - ${message}`);
  }

  res.status(statusCode).json({
    error: message
  });
}

module.exports = {
  errorHandler
};
