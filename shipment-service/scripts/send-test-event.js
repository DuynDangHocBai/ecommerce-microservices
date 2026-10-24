require('dotenv').config();
const { Kafka, logLevel } = require('kafkajs');

const brokers = (process.env.KAFKA_BROKERS || '127.0.0.1:19092').split(',').map(b => b.trim());
const topic = process.env.KAFKA_TOPIC_ORDER_CREATED || 'order-created';

const kafka = new Kafka({
  clientId: 'shipment-test-producer',
  brokers,
  logLevel: logLevel.NOTHING
});

const producer = kafka.producer();

async function main() {
  console.log('=== SENDING TEST EVENTS TO KAFKA TOPIC:', topic, '===\n');

  try {
    await producer.connect();
    console.log('[test-sender] Producer connected.');

    // (a) Event missing oid
    const invalidEvent = {
      eventId: 'test-invalid-no-oid-' + Date.now(),
      eventType: 'OrderCreated',
      uid: 5,
      items: [{ pid: 1, qty: 1, unit_price: 1500 }],
      total_amount: 1500,
      createdAt: new Date().toISOString()
    };
    console.log('(a) Sending invalid event (missing oid)...');
    await producer.send({
      topic,
      messages: [
        {
          key: 'invalid-no-oid',
          value: JSON.stringify(invalidEvent),
          headers: {
            eventId: invalidEvent.eventId,
            eventType: invalidEvent.eventType
          }
        }
      ]
    });
    console.log('(a) Sent invalid event successfully.');

    // (b) Valid event oid 990001 uid 5 SENT TWICE with SAME eventId
    const testOid = 990001;
    const testUid = 5;
    const sameEventId = 'test-dup-event-990001';
    const validEvent = {
      eventId: sameEventId,
      eventType: 'OrderCreated',
      oid: testOid,
      uid: testUid,
      discount: 10,
      total_amount: 150,
      items: [{ pid: 2, qty: 6, unit_price: 25 }],
      createdAt: new Date().toISOString()
    };

    console.log(`(b) Sending first instance of valid event oid=${testOid} (eventId: ${sameEventId})...`);
    await producer.send({
      topic,
      messages: [
        {
          key: String(testOid),
          value: JSON.stringify(validEvent),
          headers: {
            eventId: sameEventId,
            eventType: 'OrderCreated'
          }
        }
      ]
    });
    console.log('(b) Sent first instance.');

    // Wait 500ms and send second instance
    await new Promise(r => setTimeout(r, 500));
    console.log(`(b) Sending duplicate (second) instance of valid event oid=${testOid} with SAME eventId...`);
    await producer.send({
      topic,
      messages: [
        {
          key: String(testOid),
          value: JSON.stringify(validEvent),
          headers: {
            eventId: sameEventId,
            eventType: 'OrderCreated'
          }
        }
      ]
    });
    console.log('(b) Sent duplicate instance.');

    console.log('\n=== ALL TEST EVENTS SENT SUCCESSFULLY ===\n');
  } catch (err) {
    console.error('[test-sender] Error sending test events:', err.message);
    process.exit(1);
  } finally {
    await producer.disconnect();
  }
}

main();
