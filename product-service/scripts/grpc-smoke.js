require('dotenv').config();
const grpc = require('@grpc/grpc-js');
const { loadProductProto } = require('../src/infrastructure/grpc/loader');

const GRPC_HOST = process.env.PRODUCT_GRPC_URL || `127.0.0.1:${process.env.GRPC_PORT || 50053}`;

async function runSmokeTest() {
  console.log(`[grpc-smoke] Connecting to gRPC server at ${GRPC_HOST}...`);
  const productProto = loadProductProto();
  const client = new productProto.ProductService(GRPC_HOST, grpc.credentials.createInsecure());

  const getProducts = (pids) => {
    return new Promise((resolve) => {
      client.GetProducts({ pids }, (err, response) => {
        if (err) resolve({ success: false, code: err.code, details: err.details });
        else resolve({ success: true, data: response });
      });
    });
  };

  const decreaseStock = (items) => {
    return new Promise((resolve) => {
      client.DecreaseStock({ items }, (err, response) => {
        if (err) resolve({ success: false, code: err.code, details: err.details });
        else resolve({ success: true, data: response });
      });
    });
  };

  const restoreStock = (items) => {
    return new Promise((resolve) => {
      client.RestoreStock({ items }, (err, response) => {
        if (err) resolve({ success: false, code: err.code, details: err.details });
        else resolve({ success: true, data: response });
      });
    });
  };

  // Step 1: GetProducts([1, 2])
  console.log('\n--- Step 1: GetProducts([1, 2]) ---');
  const res1 = await getProducts([1, 2]);
  console.log('Result:', JSON.stringify(res1, null, 2));

  // Step 2: GetProducts([1, 999]) -> Expected NOT_FOUND
  console.log('\n--- Step 2: GetProducts([1, 999]) [Expected NOT_FOUND] ---');
  const res2 = await getProducts([1, 999]);
  console.log('Result:', JSON.stringify(res2, null, 2));

  // Step 3: DecreaseStock([{pid:1,qty:2},{pid:2,qty:1}]) rồi RestoreStock
  console.log('\n--- Step 3: DecreaseStock & RestoreStock ---');
  console.log('Stock BEFORE Decrease:');
  const beforeStep3 = await getProducts([1, 2]);
  console.log(JSON.stringify(beforeStep3.data ? beforeStep3.data.items : beforeStep3, null, 2));

  console.log('\nCalling DecreaseStock([{pid:1,qty:2},{pid:2,qty:1}])...');
  const decRes = await decreaseStock([{ pid: 1, qty: 2 }, { pid: 2, qty: 1 }]);
  console.log('Decrease Result:', JSON.stringify(decRes, null, 2));

  console.log('\nCalling RestoreStock([{pid:1,qty:2},{pid:2,qty:1}])...');
  const restRes = await restoreStock([{ pid: 1, qty: 2 }, { pid: 2, qty: 1 }]);
  console.log('Restore Result:', JSON.stringify(restRes, null, 2));

  console.log('\nStock AFTER Restore (back to original):');
  const afterStep3 = await getProducts([1, 2]);
  console.log(JSON.stringify(afterStep3.data ? afterStep3.data.items : afterStep3, null, 2));

  // Step 4: DecreaseStock([{pid:2,qty:1},{pid:1,qty:9999}]) -> Expected FAILED_PRECONDITION
  console.log('\n--- Step 4: DecreaseStock with insufficient stock [Expected FAILED_PRECONDITION] ---');
  console.log('Stock BEFORE failed decrease:');
  const beforeStep4 = await getProducts([1, 2]);
  console.log(JSON.stringify(beforeStep4.data ? beforeStep4.data.items : beforeStep4, null, 2));

  console.log('\nCalling DecreaseStock([{pid:2,qty:1},{pid:1,qty:9999}])...');
  const failDecRes = await decreaseStock([{ pid: 2, qty: 1 }, { pid: 1, qty: 9999 }]);
  console.log('Result:', JSON.stringify(failDecRes, null, 2));

  console.log('\nStock AFTER failed decrease (pid 2 MUST NOT be deducted):');
  const afterStep4 = await getProducts([1, 2]);
  console.log(JSON.stringify(afterStep4.data ? afterStep4.data.items : afterStep4, null, 2));

  client.close();
}

runSmokeTest()
  .then(() => {
    console.log('\n[grpc-smoke] Smoke test completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[grpc-smoke] Error:', err);
    process.exit(1);
  });
