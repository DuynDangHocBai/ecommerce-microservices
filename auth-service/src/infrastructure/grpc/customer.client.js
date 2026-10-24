const fs = require('fs');
const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

class CustomerGrpcClient {
  constructor() {
    this.client = null;
  }

  getClient() {
    if (this.client) {
      return this.client;
    }

    const candidates = [
      process.env.PROTO_DIR ? (path.isAbsolute(process.env.PROTO_DIR) ? path.join(process.env.PROTO_DIR, 'customer.proto') : path.resolve(process.cwd(), process.env.PROTO_DIR, 'customer.proto')) : null,
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
      throw new Error(`[auth-service] Could not locate customer.proto. Tried paths: ${candidates.join(', ')}`);
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

  createCustomer({ uid, fullname, mid = 1 }) {
    return new Promise((resolve, reject) => {
      const client = this.getClient();
      client.CreateCustomer({ uid, fullname, mid }, (err, response) => {
        if (err) {
          return reject(err);
        }
        resolve(response);
      });
    });
  }
}

module.exports = new CustomerGrpcClient();
