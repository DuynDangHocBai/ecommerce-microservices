const fs = require('fs');
const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const {
  NotFoundError,
  ConflictError,
  ServiceUnavailableError,
  BadRequestError,
  AppError
} = require('../../domain/errors');

class ProductGrpcClient {
  constructor() {
    this.client = null;
  }

  getClient() {
    if (this.client) return this.client;

    const candidates = [
      process.env.PROTO_DIR ? path.resolve(process.cwd(), process.env.PROTO_DIR, 'product.proto') : null,
      path.resolve(process.cwd(), 'proto/product.proto'),
      path.resolve(process.cwd(), '../proto/product.proto'),
      path.resolve(__dirname, '../../../../proto/product.proto'),
      path.resolve(__dirname, '../../../proto/product.proto')
    ].filter(Boolean);

    let protoPath = null;
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        protoPath = c;
        break;
      }
    }

    if (!protoPath) {
      throw new Error(`[order-service] Could not locate product.proto. Tried paths: ${candidates.join(', ')}`);
    }

    const packageDefinition = protoLoader.loadSync(protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });

    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
    const ProductService = protoDescriptor.product.ProductService;

    const targetUrl = process.env.PRODUCT_GRPC_URL || '127.0.0.1:50053';
    this.client = new ProductService(targetUrl, grpc.credentials.createInsecure());
    return this.client;
  }

  getDeadline() {
    return new Date(Date.now() + 3000);
  }

  handleGrpcError(err, defaultMessage = 'Product service error') {
    if (err.code === grpc.status.NOT_FOUND) {
      return new NotFoundError(err.details || 'Product not found');
    }
    if (err.code === grpc.status.FAILED_PRECONDITION) {
      return new ConflictError(err.details || 'Insufficient stock');
    }
    if (err.code === grpc.status.UNAVAILABLE || err.code === grpc.status.DEADLINE_EXCEEDED) {
      return new ServiceUnavailableError('Dependent service unavailable');
    }
    if (err.code === grpc.status.INVALID_ARGUMENT) {
      return new BadRequestError(err.details || 'Invalid argument');
    }
    return new AppError(err.details || defaultMessage, 500);
  }

  getProducts(pids) {
    return new Promise((resolve, reject) => {
      const client = this.getClient();
      client.GetProducts({ pids }, { deadline: this.getDeadline() }, (err, response) => {
        if (err) {
          return reject(this.handleGrpcError(err, 'Failed to get products'));
        }
        resolve(response);
      });
    });
  }

  decreaseStock(items) {
    return new Promise((resolve, reject) => {
      const client = this.getClient();
      client.DecreaseStock({ items }, { deadline: this.getDeadline() }, (err, response) => {
        if (err) {
          return reject(this.handleGrpcError(err, 'Failed to decrease stock'));
        }
        resolve(response);
      });
    });
  }

  restoreStock(items) {
    return new Promise((resolve, reject) => {
      const client = this.getClient();
      client.RestoreStock({ items }, { deadline: this.getDeadline() }, (err, response) => {
        if (err) {
          return reject(this.handleGrpcError(err, 'Failed to restore stock'));
        }
        resolve(response);
      });
    });
  }
}

module.exports = new ProductGrpcClient();
