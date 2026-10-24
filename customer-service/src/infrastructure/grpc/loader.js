const fs = require('fs');
const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

function loadCustomerProto() {
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
    throw new Error(`[customer-service] Could not locate customer.proto. Tried paths: ${candidates.join(', ')}`);
  }

  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });

  const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
  return protoDescriptor.customer;
}

module.exports = {
  loadCustomerProto
};
