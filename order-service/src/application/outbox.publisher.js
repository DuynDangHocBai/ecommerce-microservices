const prisma = require('../infrastructure/db/prisma');
const kafkaClient = require('../infrastructure/kafka/kafka.client');

class OutboxPublisher {
  constructor() {
    this.topic = process.env.KAFKA_TOPIC_ORDER_CREATED || 'order-created';
    this.pollIntervalMs = parseInt(process.env.OUTBOX_POLL_INTERVAL_MS, 10) || 2000;
    this.batchSize = parseInt(process.env.OUTBOX_BATCH_SIZE, 10) || 50;
    this.isRunning = false;
    this.timer = null;
    this.isStopped = false;
  }

  async start() {
    this.isStopped = false;
    console.log(`[outbox] Starting outbox publisher (interval: ${this.pollIntervalMs}ms, batchSize: ${this.batchSize}, topic: ${this.topic})`);

    // Initial connection attempt (failure will not crash service)
    try {
      await kafkaClient.connectProducer();
      console.log('[outbox] Kafka producer connected successfully');
    } catch (err) {
      console.warn(`[outbox] Initial Kafka producer connection failed: ${err.message}. Will retry during polling.`);
    }

    // Start background polling loop
    this.timer = setInterval(() => {
      if (!this.isStopped) {
        this.pollAndPublish().catch(err => {
          console.error('[outbox] Unexpected polling error:', err.message);
        });
      }
    }, this.pollIntervalMs);

    // Run first poll after a brief delay
    setTimeout(() => {
      if (!this.isStopped) {
        this.pollAndPublish().catch(() => {});
      }
    }, 500);
  }

  async pollAndPublish() {
    if (this.isRunning || this.isStopped) {
      return;
    }

    this.isRunning = true;
    try {
      let prod;
      try {
        prod = await kafkaClient.connectProducer();
      } catch (connErr) {
        console.warn(`[outbox] Kafka producer unavailable: ${connErr.message}. Skipping poll turn.`);
        return;
      }

      const pendingEvents = await prisma.outboxEvent.findMany({
        where: { status: 'PENDING' },
        orderBy: { id: 'asc' },
        take: this.batchSize
      });

      if (!pendingEvents || pendingEvents.length === 0) {
        return;
      }

      for (const event of pendingEvents) {
        if (this.isStopped) break;

        const payload = event.payload;
        const oid = event.aggregate_id || (payload && payload.oid);
        const eventId = (payload && payload.eventId) || String(event.id);
        const eventType = event.event_type || (payload && payload.eventType) || 'OrderCreated';

        try {
          await prod.send({
            topic: this.topic,
            messages: [
              {
                key: String(oid),
                value: JSON.stringify(payload),
                headers: {
                  eventId: String(eventId),
                  eventType: String(eventType)
                }
              }
            ]
          });

          await prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              status: 'PUBLISHED',
              published_at: new Date(),
              last_error: null
            }
          });

          console.log(`[outbox] published oid=${oid}`);
        } catch (sendErr) {
          console.error(`[outbox] retry oid=${oid} error: ${sendErr.message}`);
          await prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              attempts: { increment: 1 },
              last_error: sendErr.message
            }
          });
          // Stop current batch when Kafka errors to preserve ordering
          break;
        }
      }
    } catch (err) {
      console.error('[outbox] Error in pollAndPublish:', err.message);
    } finally {
      this.isRunning = false;
    }
  }

  async stop() {
    console.log('[outbox] Stopping outbox publisher...');
    this.isStopped = true;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    // Wait if currently running a poll
    let waitCount = 0;
    while (this.isRunning && waitCount < 10) {
      await new Promise(r => setTimeout(r, 200));
      waitCount++;
    }

    await kafkaClient.disconnectProducer();
    console.log('[outbox] Outbox publisher stopped.');
  }
}

module.exports = new OutboxPublisher();
