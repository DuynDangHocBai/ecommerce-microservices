require('dotenv').config();
const grpc = require('@grpc/grpc-js');
const { loadCustomerProto } = require('../src/infrastructure/grpc/loader');

const GRPC_HOST = process.env.CUSTOMER_GRPC_URL || `127.0.0.1:${process.env.GRPC_PORT || 50052}`;

async function runSmokeTest() {
  console.log(`[grpc-smoke] Connecting to gRPC server at ${GRPC_HOST}...`);
  const customerProto = loadCustomerProto();
  const client = new customerProto.CustomerService(GRPC_HOST, grpc.credentials.createInsecure());

  const getCustomer = (uid) => {
    return new Promise((resolve) => {
      client.GetCustomer({ uid }, (err, response) => {
        if (err) {
          resolve({ success: false, code: err.code, details: err.details });
        } else {
          resolve({ success: true, data: response });
        }
      });
    });
  };

  const getMembershipScore = (uid) => {
    return new Promise((resolve) => {
      client.GetMembershipScore({ uid }, (err, response) => {
        if (err) {
          resolve({ success: false, code: err.code, details: err.details });
        } else {
          resolve({ success: true, data: response });
        }
      });
    });
  };

  console.log('\n--- Test 1: GetCustomer(5) ---');
  const res1 = await getCustomer(5);
  console.log('Result:', JSON.stringify(res1, null, 2));

  console.log('\n--- Test 2: GetMembershipScore(5) ---');
  const res2 = await getMembershipScore(5);
  console.log('Result:', JSON.stringify(res2, null, 2));

  console.log('\n--- Test 3: GetCustomer(999) [Expected NOT_FOUND] ---');
  const res3 = await getCustomer(999);
  console.log('Result:', JSON.stringify(res3, null, 2));

  client.close();
}

runSmokeTest()
  .then(() => {
    console.log('\n[grpc-smoke] Smoke test finished.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[grpc-smoke] Error:', err);
    process.exit(1);
  });
