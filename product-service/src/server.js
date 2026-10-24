require('dotenv').config();
const grpc = require('@grpc/grpc-js');
const app = require('./app');
const { connectMongo, mongoose } = require('./infrastructure/db/mongo');
const { loadProductProto } = require('./infrastructure/grpc/loader');
const productGrpcHandler = require('./interfaces/grpc/product.handler');

const HTTP_PORT = process.env.PORT || 4103;
const GRPC_PORT = process.env.GRPC_PORT || 50053;

async function startServer() {
  // 1. Connect to MongoDB
  await connectMongo();

  // 2. Initialize and start gRPC Server
  const productProto = loadProductProto();
  const grpcServer = new grpc.Server();

  grpcServer.addService(productProto.ProductService.service, {
    GetProducts: productGrpcHandler.getProducts,
    DecreaseStock: productGrpcHandler.decreaseStock,
    RestoreStock: productGrpcHandler.restoreStock
  });

  const grpcBindAddress = `0.0.0.0:${GRPC_PORT}`;
  grpcServer.bindAsync(grpcBindAddress, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error('[product-service] Failed to bind gRPC server:', err);
      process.exit(1);
    }
    console.log(`[product-service] gRPC server running at ${grpcBindAddress}`);
  });

  // 3. Initialize and start HTTP Server
  const httpServer = app.listen(HTTP_PORT, () => {
    console.log(`[product-service] HTTP server running on port ${HTTP_PORT}`);
  });

  // Graceful shutdown handling
  function shutdown() {
    console.log('[product-service] Shutting down servers...');
    httpServer.close(() => {
      console.log('[product-service] HTTP server closed');
    });
    grpcServer.tryShutdown(() => {
      console.log('[product-service] gRPC server shutdown complete');
    });
    mongoose.connection.close(false).then(() => {
      console.log('[product-service] MongoDB connection closed');
    });
  }

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('[product-service] Server startup failed:', err);
  process.exit(1);
});
