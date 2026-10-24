const { Kafka, logLevel } = require('kafkajs');

const brokers = (process.env.KAFKA_BROKERS || '127.0.0.1:19092').split(',').map(b => b.trim());
const clientId = process.env.KAFKA_CLIENT_ID || 'order-service';

const kafka = new Kafka({
  clientId,
  brokers,
  logLevel: logLevel.NOTHING,
  retry: {
    initialRetryTime: 300,
    retries: 5
  }
});

let producer = null;
let isConnected = false;

function getProducer() {
  if (!producer) {
    producer = kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000
    });

    producer.on('producer.connect', () => {
      isConnected = true;
    });

    producer.on('producer.disconnect', () => {
      isConnected = false;
    });
  }
  return producer;
}

async function connectProducer() {
  const prod = getProducer();
  if (!isConnected) {
    await prod.connect();
    isConnected = true;
  }
  return prod;
}

async function disconnectProducer() {
  if (producer && isConnected) {
    try {
      await producer.disconnect();
    } catch (err) {
      console.warn('[kafka] Producer disconnect warning:', err.message);
    } finally {
      isConnected = false;
    }
  }
}

function isProducerConnected() {
  return isConnected;
}

async function checkKafkaHealth() {
  try {
    const admin = kafka.admin();
    await Promise.race([
      (async () => {
        await admin.connect();
        await admin.listTopics();
        await admin.disconnect();
      })(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Kafka health timeout')), 2500))
    ]);
    return 'UP';
  } catch (err) {
    return 'DOWN';
  }
}

module.exports = {
  kafka,
  getProducer,
  connectProducer,
  disconnectProducer,
  isProducerConnected,
  checkKafkaHealth
};
