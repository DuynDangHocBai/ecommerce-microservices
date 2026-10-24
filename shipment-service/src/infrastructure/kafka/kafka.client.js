const { Kafka, logLevel } = require('kafkajs');

const brokers = (process.env.KAFKA_BROKERS || '127.0.0.1:19092').split(',').map(b => b.trim());
const clientId = process.env.KAFKA_CLIENT_ID || 'shipment-service';

const kafka = new Kafka({
  clientId,
  brokers,
  logLevel: logLevel.NOTHING,
  retry: {
    initialRetryTime: 300,
    retries: 5
  }
});

async function checkKafkaHealth() {
  try {
    const admin = kafka.admin();
    await Promise.race([
      (async () => {
        await admin.connect();
        await admin.listTopics();
        await admin.disconnect();
      })(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Kafka timeout')), 2500))
    ]);
    return 'UP';
  } catch (err) {
    return 'DOWN';
  }
}

module.exports = {
  kafka,
  checkKafkaHealth
};
