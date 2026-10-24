const grpc = require('@grpc/grpc-js');
const customerService = require('../../application/customer.service');
const { NotFoundError, AppError, BadRequestError } = require('../../domain/errors');

const customerGrpcHandler = {
  async getCustomer(call, callback) {
    try {
      const uid = call.request.uid;
      if (!uid || typeof uid !== 'number' || uid <= 0) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          details: 'Valid uid is required'
        });
      }

      const customer = await customerService.getCustomerById(uid);
      callback(null, {
        uid: customer.uid,
        fullname: customer.fullname,
        mid: customer.mid
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return callback({
          code: grpc.status.NOT_FOUND,
          details: error.message
        });
      }
      console.error('[customer-service] gRPC getCustomer error:', error);
      callback({
        code: grpc.status.INTERNAL,
        details: 'Internal gRPC error'
      });
    }
  },

  async getMembershipScore(call, callback) {
    try {
      const uid = call.request.uid;
      if (!uid || typeof uid !== 'number' || uid <= 0) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          details: 'Valid uid is required'
        });
      }

      const membership = await customerService.getMembershipScore(uid);
      callback(null, {
        uid: membership.uid,
        mid: membership.mid,
        mname: membership.mname,
        score: membership.score
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return callback({
          code: grpc.status.NOT_FOUND,
          details: error.message
        });
      }
      console.error('[customer-service] gRPC getMembershipScore error:', error);
      callback({
        code: grpc.status.INTERNAL,
        details: 'Internal gRPC error'
      });
    }
  },

  async createCustomer(call, callback) {
    try {
      const { uid, fullname, mid } = call.request;
      if (!uid || typeof uid !== 'number' || uid <= 0 || !fullname || typeof fullname !== 'string') {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          details: 'Valid uid and fullname are required'
        });
      }

      const customer = await customerService.createCustomer({
        uid,
        fullname,
        mid: mid || 1
      });

      callback(null, {
        uid: customer.uid,
        fullname: customer.fullname,
        mid: customer.mid
      });
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 409) {
        return callback({
          code: grpc.status.ALREADY_EXISTS,
          details: error.message
        });
      }
      if (error instanceof BadRequestError) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          details: error.message
        });
      }
      console.error('[customer-service] gRPC createCustomer error:', error);
      callback({
        code: grpc.status.INTERNAL,
        details: 'Internal gRPC error'
      });
    }
  }
};

module.exports = customerGrpcHandler;
