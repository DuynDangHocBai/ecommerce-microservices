require('dotenv').config();
const { Kafka, logLevel } = require('kafkajs');

const brokers = (process.env.KAFKA_BROKERS || '127.0.0.1:19092').split(',').map(b => b.trim());
const topic = process.env.KAFKA_TOPIC_ORDER_CREATED || 'order-created';
const groupId = `order-peek-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

const kafka = new Kafka({
  clientId: 'order-peek-client',
  brokers,
  logLevel: logLevel.NOTHING
});

const consumer = kafka.consumer({ groupId });

async function main() {
  console.log(`\n=== PEEKING TOPIC: ${topic} (Group: ${groupId}) ===`);
  console.log('Connecting to Kafka and subscribing from beginning (will auto-exit in 8 seconds)...\n');

  let messageCount = 0;

  // Auto exit after 8 seconds as specified
  const timeoutTimer = setTimeout(async () => {
    console.log(`\n[kafka:peek] 8 seconds completed. Total messages read: ${messageCount}. Disconnecting.`);
    try {
      await consumer.disconnect();
    } catch {}
    process.exit(0);
  }, 8000);

  try {
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        messageCount++;
        const key = message.key ? message.key.toString() : 'null';
        const headers = {};
        if (message.headers) {
          for (const [k, v] of Object.entries(message.headers)) {
            headers[k] = v ? v.toString() : null;
          }
        }

        let parsedValue;
        const rawValue = message.value ? message.value.toString() : '';
        try {
          parsedValue = JSON.parse(rawValue);
        } catch {
          parsedValue = rawValue;
        }

        console.log(`--- [Message #${messageCount}] Partition: ${partition} | Offset: ${message.offset} ---`);
        console.log(`Key:     ${key}`);
        console.log(`Headers:`, headers);
        console.log(`Value:  `, JSON.stringify(parsedValue, null, 2));
        console.log('-----------------------------------------------------\n');
      }
    });
  } catch (err) {
    clearTimeout(timeoutTimer);
    console.error('[kafka:peek] Consumer error:', err.message);
    try {
      await consumer.disconnect();
    } catch {}
    process.exit(1);
  }
}

main();
