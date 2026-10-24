const fs = require('fs');
const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const {
  NotFoundError,
  ServiceUnavailableError,
  BadRequestError,
  AppError
} = require('../../domain/errors');

class CustomerGrpcClient {
  constructor() {
    this.client = null;
  }

  getClient() {
    if (this.client) return this.client;

    const candidates = [
      process.env.PROTO_DIR ? path.resolve(process.cwd(), process.env.PROTO_DIR, 'customer.proto') : null,
      path.resolve(process.cwd(), 'proto/customer.proto'),
      path.resolve(process.cwd(), '../proto/customer.proto'),
      path.resolve(__dirname, '../../../../proto/customer.proto'),
      path.resolve(__dirname, '../../../proto/customer.proto')
    ].filter(Boolean);

    let protoPath = null;
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        protoPath = c;
        break;
      }
    }

    if (!protoPath) {
      throw new Error(`[order-service] Could not locate customer.proto. Tried paths: ${candidates.join(', ')}`);
    }

    const packageDefinition = protoLoader.loadSync(protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });

    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
    const CustomerService = protoDescriptor.customer.CustomerService;

    const targetUrl = process.env.CUSTOMER_GRPC_URL || '127.0.0.1:50052';
    this.client = new CustomerService(targetUrl, grpc.credentials.createInsecure());
    return this.client;
  }

  getDeadline() {
    return new Date(Date.now() + 3000);
  }

  handleGrpcError(err, defaultMessage = 'Customer service error') {
    if (err.code === grpc.status.NOT_FOUND) {
      return new NotFoundError(err.details || 'Customer not found');
    }
    if (err.code === grpc.status.UNAVAILABLE || err.code === grpc.status.DEADLINE_EXCEEDED) {
      return new ServiceUnavailableError('Dependent service unavailable');
    }
    if (err.code === grpc.status.INVALID_ARGUMENT) {
      return new BadRequestError(err.details || 'Invalid argument');
    }
    return new AppError(err.details || defaultMessage, 500);
  }

  getCustomer(uid) {
    return new Promise((resolve, reject) => {
      const client = this.getClient();
      client.GetCustomer({ uid }, { deadline: this.getDeadline() }, (err, response) => {
        if (err) {
          return reject(this.handleGrpcError(err, 'Failed to get customer'));
        }
        resolve(response);
      });
    });
  }

  getMembershipScore(uid) {
    return new Promise((resolve, reject) => {
      const client = this.getClient();
      client.GetMembershipScore({ uid }, { deadline: this.getDeadline() }, (err, response) => {
        if (err) {
          return reject(this.handleGrpcError(err, 'Failed to get membership score'));
        }
        resolve(response);
      });
    });
  }
}

module.exports = new CustomerGrpcClient();
