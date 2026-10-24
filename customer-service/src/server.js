require('dotenv').config();
const grpc = require('@grpc/grpc-js');
const app = require('./app');
const { loadCustomerProto } = require('./infrastructure/grpc/loader');
const customerGrpcHandler = require('./interfaces/grpc/customer.handler');

const HTTP_PORT = process.env.PORT || 4102;
const GRPC_PORT = process.env.GRPC_PORT || 50052;

// 1. Initialize and start gRPC Server
const customerProto = loadCustomerProto();
const grpcServer = new grpc.Server();

grpcServer.addService(customerProto.CustomerService.service, {
  GetCustomer: customerGrpcHandler.getCustomer,
  GetMembershipScore: customerGrpcHandler.getMembershipScore,
  CreateCustomer: customerGrpcHandler.createCustomer
});

const grpcBindAddress = `0.0.0.0:${GRPC_PORT}`;
grpcServer.bindAsync(grpcBindAddress, grpc.ServerCredentials.createInsecure(), (err, port) => {
  if (err) {
    console.error(`[customer-service] Failed to bind gRPC server:`, err);
    process.exit(1);
  }
  console.log(`[customer-service] gRPC server running at ${grpcBindAddress}`);
});

// 2. Initialize and start HTTP Server
const httpServer = app.listen(HTTP_PORT, () => {
  console.log(`[customer-service] HTTP server running on port ${HTTP_PORT}`);
});

// Graceful shutdown handling
function shutdown() {
  console.log('[customer-service] Shutting down servers...');
  httpServer.close(() => {
    console.log('[customer-service] HTTP server closed');
  });
  grpcServer.tryShutdown(() => {
    console.log('[customer-service] gRPC server shutdown complete');
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
