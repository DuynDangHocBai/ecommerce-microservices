const fs = require('fs');
const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

function loadProductProto() {
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
    throw new Error(`[product-service] Could not locate product.proto. Tried paths: ${candidates.join(', ')}`);
  }

  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });

  const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
  return protoDescriptor.product;
}

module.exports = {
  loadProductProto
};
