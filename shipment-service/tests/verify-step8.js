const http = require('http');
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:37019/shipment_db';

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING SHIPMENT SERVICE STEP 8 VERIFICATION ===\n');

  // Test 1: GET /health
  console.log('--- Test 1: GET /health ---');
  const healthRes = await request({
    hostname: '127.0.0.1',
    port: 4105,
    path: '/health',
    method: 'GET'
  });
  console.log('Result:', healthRes.status, JSON.stringify(healthRes.body));
  if (healthRes.status !== 200 || healthRes.body.status !== 'UP' || healthRes.body.db !== 'UP') {
    throw new Error('Health check failed: Expected 200, status UP, db UP');
  }

  // Connect to MongoDB to verify records directly
  await mongoose.connect(MONGO_URI);
  const Shipment = mongoose.model('Shipment', new mongoose.Schema({}, { strict: false }), 'shipments');
  const ProcessedEvent = mongoose.model('ProcessedEvent', new mongoose.Schema({}, { strict: false }), 'processed_events');

  // Test 2: Check shipments created from existing Kafka topic messages
  console.log('\n--- Test 2: Check Existing Shipments from Kafka ---');
  const allShipments = await Shipment.find({});
  console.log(`Found ${allShipments.length} existing shipments in shipment_db:`);
  allShipments.forEach(s => {
    console.log(`- shipid: ${s.get('shipid')}, oid: ${s.get('oid')}, uid: ${s.get('uid')}, status: ${s.get('status')}`);
  });

  // Test 3: Missing x-user-id -> 401
  console.log('\n--- Test 3: Missing x-user-id header -> 401 ---');
  const noAuthRes = await request({
    hostname: '127.0.0.1',
    port: 4105,
    path: '/api/shipments/order/990001',
    method: 'GET'
  });
  console.log('Result:', noAuthRes.status, JSON.stringify(noAuthRes.body));
  if (noAuthRes.status !== 401) throw new Error('Expected 401 for missing x-user-id');

  // Test 4: Query shipment for oid 990001 (created by send-test-event)
  console.log('\n--- Test 4: GET /api/shipments/order/990001 (CUSTOMER uid 5) ---');
  const shipmentOrderRes = await request({
    hostname: '127.0.0.1',
    port: 4105,
    path: '/api/shipments/order/990001',
    method: 'GET',
    headers: {
      'x-user-id': '5',
      'x-user-role': 'CUSTOMER'
    }
  });
  console.log('Result:', shipmentOrderRes.status, JSON.stringify(shipmentOrderRes.body));
  if (shipmentOrderRes.status !== 200 || shipmentOrderRes.body.status !== 'PENDING') {
    throw new Error('Expected 200 with status PENDING for oid 990001');
  }
  const testShipId = shipmentOrderRes.body.shipid;

  // Verify only ONE shipment exists for oid 990001 despite being sent twice
  const count990001 = await Shipment.countDocuments({ oid: 990001 });
  console.log(`Shipment count for oid 990001 in DB: ${count990001}`);
  if (count990001 !== 1) {
    throw new Error(`Expected exactly 1 shipment for oid 990001, found ${count990001}`);
  }

  // Test 5: Other customer viewing oid 990001 -> 403
  console.log('\n--- Test 5: Other customer (uid 3) viewing oid 990001 -> 403 ---');
  const forbiddenRes = await request({
    hostname: '127.0.0.1',
    port: 4105,
    path: '/api/shipments/order/990001',
    method: 'GET',
    headers: {
      'x-user-id': '3',
      'x-user-role': 'CUSTOMER'
    }
  });
  console.log('Result:', forbiddenRes.status, JSON.stringify(forbiddenRes.body));
  if (forbiddenRes.status !== 403) throw new Error('Expected 403 for other customer viewing shipment');

  // Test 6: PATCH status to SHIPPING by SHIPMENT_STAFF (uid 2) -> 200
  console.log('\n--- Test 6: PATCH /api/shipments/:shipid/status -> SHIPPING (SHIPMENT_STAFF) ---');
  const patchShippingRes = await request({
    hostname: '127.0.0.1',
    port: 4105,
    path: `/api/shipments/${testShipId}/status`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': '2',
      'x-user-role': 'SHIPMENT_STAFF'
    }
  }, { status: 'SHIPPING' });
  console.log('Result:', patchShippingRes.status, JSON.stringify(patchShippingRes.body));
  if (patchShippingRes.status !== 200 || patchShippingRes.body.status !== 'SHIPPING') {
    throw new Error('Expected 200 with status SHIPPING');
  }

  // Test 7: Invalid transition SHIPPING -> PENDING -> 400
  console.log('\n--- Test 7: Invalid transition SHIPPING -> PENDING -> 400 ---');
  const invalidTransitionRes = await request({
    hostname: '127.0.0.1',
    port: 4105,
    path: `/api/shipments/${testShipId}/status`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': '2',
      'x-user-role': 'SHIPMENT_STAFF'
    }
  }, { status: 'PENDING' });
  console.log('Result:', invalidTransitionRes.status, JSON.stringify(invalidTransitionRes.body));
  if (invalidTransitionRes.status !== 400) throw new Error('Expected 400 for invalid transition');

  // Test 8: CUSTOMER attempting to PATCH status -> 403
  console.log('\n--- Test 8: CUSTOMER attempting PATCH status -> 403 ---');
  const customerPatchRes = await request({
    hostname: '127.0.0.1',
    port: 4105,
    path: `/api/shipments/${testShipId}/status`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': '5',
      'x-user-role': 'CUSTOMER'
    }
  }, { status: 'DELIVERED' });
  console.log('Result:', customerPatchRes.status, JSON.stringify(customerPatchRes.body));
  if (customerPatchRes.status !== 403) throw new Error('Expected 403 for CUSTOMER attempting status update');

  // Test 9: Non-existent shipid -> 404
  console.log('\n--- Test 9: Non-existent shipid 999999 -> 404 ---');
  const notFoundRes = await request({
    hostname: '127.0.0.1',
    port: 4105,
    path: '/api/shipments/999999',
    method: 'GET',
    headers: {
      'x-user-id': '1',
      'x-user-role': 'ADMIN'
    }
  });
  console.log('Result:', notFoundRes.status, JSON.stringify(notFoundRes.body));
  if (notFoundRes.status !== 404) throw new Error('Expected 404 for non-existent shipid');

  console.log('\n=== ALL TESTS PASSED! CLEANING UP TEST DATA FOR OID 990001 ===');
  await Shipment.deleteMany({ oid: 990001 });
  await ProcessedEvent.deleteMany({ eventId: 'test-dup-event-990001' });
  console.log('Cleaned up oid 990001 test records. Genuine order events preserved.\n');

  await mongoose.disconnect();
}

runTests().catch(async err => {
  console.error('Verification failed:', err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
