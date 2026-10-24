class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(message, 400);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409);
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = 'Dependent service unavailable') {
    super(message, 503);
  }
}

module.exports = {
  AppError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
  ServiceUnavailableError
};
