const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
  console.log('=== STARTING ORDER SERVICE STEP 6 VERIFICATION ===\n');

  // Test 1: Health check
  console.log('--- Test 1: GET /health ---');
  const healthRes = await request({
    hostname: '127.0.0.1',
    port: 4104,
    path: '/health',
    method: 'GET'
  });
  console.log('Result:', healthRes.status, JSON.stringify(healthRes.body));
  if (healthRes.status !== 200 || healthRes.body.status !== 'UP' || healthRes.body.db !== 'UP') {
    throw new Error('Health check failed');
  }

  // Test 2: Missing x-user-id header -> 401
  console.log('\n--- Test 2: Missing x-user-id -> 401 ---');
  const noAuthRes = await request({
    hostname: '127.0.0.1',
    port: 4104,
    path: '/api/orders',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { items: [{ pid: 1, qty: 1 }] });
  console.log('Result:', noAuthRes.status, JSON.stringify(noAuthRes.body));
  if (noAuthRes.status !== 401) throw new Error('Expected 401 for missing x-user-id');

  // Test 3: Empty items -> 400
  console.log('\n--- Test 3: Empty items -> 400 ---');
  const emptyItemsRes = await request({
    hostname: '127.0.0.1',
    port: 4104,
    path: '/api/orders',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': '3',
      'x-user-role': 'CUSTOMER'
    }
  }, { items: [] });
  console.log('Result:', emptyItemsRes.status, JSON.stringify(emptyItemsRes.body));
  if (emptyItemsRes.status !== 400) throw new Error('Expected 400 for empty items');

  // Test 4: Non-existent product pid 999 -> 404
  console.log('\n--- Test 4: Non-existent product pid 999 -> 404 ---');
  const notFoundPidRes = await request({
    hostname: '127.0.0.1',
    port: 4104,
    path: '/api/orders',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': '3',
      'x-user-role': 'CUSTOMER'
    }
  }, { items: [{ pid: 999, qty: 1 }] });
  console.log('Result:', notFoundPidRes.status, JSON.stringify(notFoundPidRes.body));
  if (notFoundPidRes.status !== 404) throw new Error('Expected 404 for non-existent product');

  // Test 5: Insufficient stock qty 9999 -> 409
  console.log('\n--- Test 5: Insufficient stock qty 9999 -> 409 ---');
  const excessQtyRes = await request({
    hostname: '127.0.0.1',
    port: 4104,
    path: '/api/orders',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': '3',
      'x-user-role': 'CUSTOMER'
    }
  }, { items: [{ pid: 1, qty: 9999 }] });
  console.log('Result:', excessQtyRes.status, JSON.stringify(excessQtyRes.body));
  if (excessQtyRes.status !== 409) throw new Error('Expected 409 for insufficient stock');

  // Test 6: Order for uid 3 (BRONZE - discount 0, total 1550)
  console.log('\n--- Test 6: Order uid 3 (BRONZE) [{pid:1,qty:1},{pid:2,qty:2}] ---');
  const orderBronze = await request({
    hostname: '127.0.0.1',
    port: 4104,
    path: '/api/orders',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': '3',
      'x-user-role': 'CUSTOMER'
    }
  }, { items: [{ pid: 1, qty: 1 }, { pid: 2, qty: 2 }] });
  console.log('Result:', orderBronze.status, JSON.stringify(orderBronze.body));
  if (orderBronze.status !== 201) throw new Error('Order creation for uid 3 failed');
  if (orderBronze.body.discount !== 0 || orderBronze.body.total_amount !== 1550) {
    throw new Error(`Unexpected discount/total: ${orderBronze.body.discount}, ${orderBronze.body.total_amount}`);
  }
  if (typeof orderBronze.body.total_amount !== 'number' || typeof orderBronze.body.discount !== 'number') {
    throw new Error('Prices must be of type number');
  }

  // Test 7: Order for uid 4 (SILVER - discount 5, total 1472.5)
  console.log('\n--- Test 7: Order uid 4 (SILVER) [{pid:1,qty:1},{pid:2,qty:2}] ---');
  const orderSilver = await request({
    hostname: '127.0.0.1',
    port: 4104,
    path: '/api/orders',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': '4',
      'x-user-role': 'CUSTOMER'
    }
  }, { items: [{ pid: 1, qty: 1 }, { pid: 2, qty: 2 }] });
  console.log('Result:', orderSilver.status, JSON.stringify(orderSilver.body));
  if (orderSilver.status !== 201) throw new Error('Order creation for uid 4 failed');
  if (orderSilver.body.discount !== 5 || orderSilver.body.total_amount !== 1472.5) {
    throw new Error(`Unexpected discount/total: ${orderSilver.body.discount}, ${orderSilver.body.total_amount}`);
  }

  // Test 8: Order for uid 5 (GOLD - discount 10, total 1395)
  console.log('\n--- Test 8: Order uid 5 (GOLD) [{pid:1,qty:1},{pid:2,qty:2}] ---');
  const orderGold = await request({
    hostname: '127.0.0.1',
    port: 4104,
    path: '/api/orders',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': '5',
      'x-user-role': 'CUSTOMER'
    }
  }, { items: [{ pid: 1, qty: 1 }, { pid: 2, qty: 2 }] });
  console.log('Result:', orderGold.status, JSON.stringify(orderGold.body));
  if (orderGold.status !== 201) throw new Error('Order creation for uid 5 failed');
  if (orderGold.body.discount !== 10 || orderGold.body.total_amount !== 1395) {
    throw new Error(`Unexpected discount/total: ${orderGold.body.discount}, ${orderGold.body.total_amount}`);
  }

  // Test 9: Verify OutboxEvents in order_db
  console.log('\n--- Test 9: Verify Outbox Events in order_db ---');
  const outboxEvents = await prisma.outboxEvent.findMany({
    orderBy: { id: 'asc' }
  });
  console.log(`Found ${outboxEvents.length} OutboxEvents:`);
  outboxEvents.forEach(e => {
    console.log(`- ID: ${e.id}, EventType: ${e.event_type}, AggregateId: ${e.aggregate_id}, Status: ${e.status}, Attempts: ${e.attempts}`);
    console.log(`  Payload:`, JSON.stringify(e.payload));
  });
  if (outboxEvents.length < 3 || outboxEvents.some(e => e.status !== 'PENDING')) {
    throw new Error('Outbox events verification failed');
  }

  // Test 10: GET /api/orders (Customer only views own orders, Admin views all)
  console.log('\n--- Test 10: GET /api/orders (CUSTOMER vs ADMIN) ---');
  const customerOrdersRes = await request({
    hostname: '127.0.0.1',
    port: 4104,
    path: '/api/orders',
    method: 'GET',
    headers: {
      'x-user-id': '3',
      'x-user-role': 'CUSTOMER'
    }
  });
  console.log(`Customer uid 3 orders count: ${customerOrdersRes.body.items.length}`);
  if (customerOrdersRes.body.items.some(o => o.uid !== 3)) {
    throw new Error('Customer saw orders of another user');
  }

  const adminOrdersRes = await request({
    hostname: '127.0.0.1',
    port: 4104,
    path: '/api/orders',
    method: 'GET',
    headers: {
      'x-user-id': '1',
      'x-user-role': 'ADMIN'
    }
  });
  console.log(`Admin orders count: ${adminOrdersRes.body.items.length}`);
  if (adminOrdersRes.body.items.length < 3) {
    throw new Error('Admin should see all orders');
  }

  // Test 11: GET /api/orders/:oid (Authorization check)
  console.log('\n--- Test 11: GET /api/orders/:oid Authorization ---');
  const targetOid = orderBronze.body.oid;
  // Owner uid 3 view -> 200
  const ownerRes = await request({
    hostname: '127.0.0.1',
    port: 4104,
    path: `/api/orders/${targetOid}`,
    method: 'GET',
    headers: {
      'x-user-id': '3',
      'x-user-role': 'CUSTOMER'
    }
  });
  console.log(`Owner view (uid 3):`, ownerRes.status, `Items count: ${ownerRes.body.items.length}`);
  if (ownerRes.status !== 200) throw new Error('Owner failed to view order');

  // Other user uid 4 view -> 403
  const otherRes = await request({
    hostname: '127.0.0.1',
    port: 4104,
    path: `/api/orders/${targetOid}`,
    method: 'GET',
    headers: {
      'x-user-id': '4',
      'x-user-role': 'CUSTOMER'
    }
  });
  console.log(`Other user view (uid 4):`, otherRes.status, JSON.stringify(otherRes.body));
  if (otherRes.status !== 403) throw new Error('Expected 403 for unauthorized viewer');

  // Admin view -> 200
  const adminSingleRes = await request({
    hostname: '127.0.0.1',
    port: 4104,
    path: `/api/orders/${targetOid}`,
    method: 'GET',
    headers: {
      'x-user-id': '1',
      'x-user-role': 'ADMIN'
    }
  });
  console.log(`Admin view:`, adminSingleRes.status, `Items count: ${adminSingleRes.body.items.length}`);
  if (adminSingleRes.status !== 200) throw new Error('Admin failed to view order');

  // Non-existent order -> 404
  const notFoundOrderRes = await request({
    hostname: '127.0.0.1',
    port: 4104,
    path: `/api/orders/99999`,
    method: 'GET',
    headers: {
      'x-user-id': '1',
      'x-user-role': 'ADMIN'
    }
  });
  console.log(`Non-existent order view:`, notFoundOrderRes.status, JSON.stringify(notFoundOrderRes.body));
  if (notFoundOrderRes.status !== 404) throw new Error('Expected 404 for non-existent order');

  console.log('\n=== ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ===\n');
}

runTests()
  .catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
