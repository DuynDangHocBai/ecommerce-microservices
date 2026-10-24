const grpc = require('@grpc/grpc-js');
const productService = require('../../application/product.service');
const {
  NotFoundError,
  BadRequestError,
  AppError
} = require('../../domain/errors');

const productGrpcHandler = {
  async getProducts(call, callback) {
    try {
      const pids = call.request.pids;
      if (!pids || !Array.isArray(pids) || pids.length === 0) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          details: 'pids array cannot be empty'
        });
      }

      const result = await productService.getProductsByPids(pids);
      callback(null, result);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return callback({
          code: grpc.status.NOT_FOUND,
          details: error.message
        });
      }
      if (error instanceof BadRequestError) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          details: error.message
        });
      }
      console.error('[product-service] gRPC getProducts error:', error);
      callback({
        code: grpc.status.INTERNAL,
        details: 'Internal gRPC error'
      });
    }
  },

  async decreaseStock(call, callback) {
    try {
      const items = call.request.items;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          details: 'Stock items array cannot be empty'
        });
      }

      const result = await productService.decreaseStock(items);
      callback(null, result);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return callback({
          code: grpc.status.NOT_FOUND,
          details: error.message
        });
      }
      if (error instanceof BadRequestError) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          details: error.message
        });
      }
      if (error.code === 'FAILED_PRECONDITION' || error.statusCode === 412) {
        return callback({
          code: grpc.status.FAILED_PRECONDITION,
          details: error.message
        });
      }
      console.error('[product-service] gRPC decreaseStock error:', error);
      callback({
        code: grpc.status.INTERNAL,
        details: 'Internal gRPC error'
      });
    }
  },

  async restoreStock(call, callback) {
    try {
      const items = call.request.items;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          details: 'Stock items array cannot be empty'
        });
      }

      const result = await productService.restoreStock(items);
      callback(null, result);
    } catch (error) {
      if (error instanceof BadRequestError) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          details: error.message
        });
      }
      console.error('[product-service] gRPC restoreStock error:', error);
      callback({
        code: grpc.status.INTERNAL,
        details: 'Internal gRPC error'
      });
    }
  }
};

module.exports = productGrpcHandler;
