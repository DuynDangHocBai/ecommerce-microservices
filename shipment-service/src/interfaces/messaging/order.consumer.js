const { kafka } = require('../../infrastructure/kafka/kafka.client');
const shipmentService = require('../../application/shipment.service');

class OrderConsumer {
  constructor() {
    this.groupId = process.env.KAFKA_GROUP_ID || 'shipment-service';
    this.topic = process.env.KAFKA_TOPIC_ORDER_CREATED || 'order-created';
    this.consumer = null;
    this.isConnected = false;
    this.isStopped = false;
  }

  async start() {
    this.isStopped = false;
    // Launch connection loop in background
    this.connectAndRun().catch(err => {
      console.error('[shipment] Unexpected error in consumer connection loop:', err.message);
    });
  }

  async connectAndRun() {
    while (!this.isStopped && !this.isConnected) {
      try {
        this.consumer = kafka.consumer({ groupId: this.groupId });
        await this.consumer.connect();
        await this.consumer.subscribe({
          topic: this.topic,
          fromBeginning: true
        });
        this.isConnected = true;
        console.log(`[shipment] Kafka consumer connected and subscribed to topic: ${this.topic} (groupId: ${this.groupId})`);

        await this.consumer.run({
          eachMessage: async ({ topic, partition, message }) => {
            await this.handleMessage(message);
          }
        });
        break;
      } catch (err) {
        console.warn(`[shipment] Kafka consumer connection error (${err.message}). Retrying in 5s...`);
        if (this.consumer) {
          try {
            await this.consumer.disconnect();
          } catch {}
          this.consumer = null;
        }
        if (!this.isStopped) {
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    }
  }

  async handleMessage(message) {
    let payload;
    const rawValue = message.value ? message.value.toString() : '';

    try {
      payload = JSON.parse(rawValue);
    } catch (err) {
      console.warn(`[shipment] invalid event: Malformed JSON (${err.message}). Raw: "${rawValue}"`);
      return;
    }

    try {
      const result = await shipmentService.processOrderCreatedEvent(payload);

      if (result.status === 'INVALID') {
        console.warn(`[shipment] invalid event: ${result.reason}. Payload: ${JSON.stringify(payload)}`);
        return;
      }

      if (result.status === 'DUPLICATE') {
        console.warn(`[shipment] duplicate event: ${result.reason}`);
        return;
      }

      if (result.status === 'CREATED') {
        console.log(`[shipment] created shipid=${result.shipment.shipid} for oid=${result.shipment.oid}`);
      }
    } catch (err) {
      console.error(`[shipment] Transient error processing message for oid=${payload && payload.oid}:`, err.message);
      throw err; // Rethrow so kafkajs will retry (no commit)
    }
  }

  async stop() {
    console.log('[shipment] Stopping Kafka consumer...');
    this.isStopped = true;

    if (this.consumer && this.isConnected) {
      try {
        await this.consumer.disconnect();
        this.isConnected = false;
        console.log('[shipment] Kafka consumer disconnected.');
      } catch (err) {
        console.warn('[shipment] Error disconnecting Kafka consumer:', err.message);
      }
    }
  }
}

module.exports = new OrderConsumer();
